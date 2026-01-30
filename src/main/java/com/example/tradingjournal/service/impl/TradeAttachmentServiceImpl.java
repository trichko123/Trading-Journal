package com.example.tradingjournal.service.impl;

import com.example.tradingjournal.model.Trade;
import com.example.tradingjournal.model.TradeAttachment;
import com.example.tradingjournal.model.TradeAttachmentSection;
import com.example.tradingjournal.repository.TradeAttachmentRepository;
import com.example.tradingjournal.repository.TradeRepository;
import com.example.tradingjournal.service.TradeAttachmentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class TradeAttachmentServiceImpl implements TradeAttachmentService {
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "image/jpg", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg", "webp");

    private final TradeAttachmentRepository attachments;
    private final TradeRepository trades;
    private final Path uploadRoot;

    public TradeAttachmentServiceImpl(
            TradeAttachmentRepository attachments,
            TradeRepository trades,
            @Value("${app.upload.dir:uploads}") String uploadDir
    ) {
        this.attachments = attachments;
        this.trades = trades;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public TradeAttachment create(Long tradeId, TradeAttachmentSection section, MultipartFile file) {
        Trade trade = findOwnedTrade(tradeId);
        validateFile(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String extension = resolveExtension(originalFilename, file.getContentType());
        String storedFilename = UUID.randomUUID() + "." + extension;

        Path relativePath = Paths.get("trades", tradeId.toString(), section.name(), storedFilename);
        Path destination = uploadRoot.resolve(relativePath).normalize();
        if (!destination.startsWith(uploadRoot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        }

        try {
            Files.createDirectories(destination.getParent());
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        TradeAttachment attachment = new TradeAttachment();
        attachment.setTrade(trade);
        attachment.setSection(section);
        attachment.setOriginalFilename(originalFilename.isEmpty() ? null : originalFilename);
        attachment.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        attachment.setFileSize(file.getSize());
        attachment.setRelativePath(normalizeRelativePath(relativePath));
        attachment.setCreatedAt(Instant.now());
        return attachments.save(attachment);
    }

    @Override
    public List<TradeAttachment> listForTrade(Long tradeId) {
        findOwnedTrade(tradeId);
        return attachments.findAllByTradeIdOrderByCreatedAtDesc(tradeId);
    }

    @Override
    public TradeAttachment updateTimeframe(Long attachmentId, String timeframe) {
        TradeAttachment attachment = attachments.findByIdAndTradeUserEmail(attachmentId, currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        attachment.setTimeframe(timeframe);
        return attachments.save(attachment);
    }

    @Override
    public void delete(Long attachmentId) {
        TradeAttachment attachment = attachments.findByIdAndTradeUserEmail(attachmentId, currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        Path path = uploadRoot.resolve(attachment.getRelativePath()).normalize();
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete file");
        }
        attachments.delete(attachment);
    }

    @Override
    public void deleteByTradeId(Long tradeId) {
        findOwnedTrade(tradeId);
        List<TradeAttachment> tradeAttachments = attachments.findAllByTradeIdOrderByCreatedAtDesc(tradeId);
        for (TradeAttachment attachment : tradeAttachments) {
            Path path = uploadRoot.resolve(attachment.getRelativePath()).normalize();
            try {
                Files.deleteIfExists(path);
            } catch (IOException ex) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete file");
            }
            attachments.delete(attachment);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type");
        }
        String filename = file.getOriginalFilename();
        if (filename != null) {
            String ext = StringUtils.getFilenameExtension(filename);
            if (ext != null && !ALLOWED_EXTENSIONS.contains(ext.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file extension");
            }
        }
    }

    private String resolveExtension(String filename, String contentType) {
        String ext = StringUtils.getFilenameExtension(filename);
        if (ext != null && ALLOWED_EXTENSIONS.contains(ext.toLowerCase(Locale.ROOT))) {
            return ext.toLowerCase(Locale.ROOT);
        }
        if (contentType == null) {
            return "png";
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (normalized.contains("jpeg")) return "jpg";
        if (normalized.contains("jpg")) return "jpg";
        if (normalized.contains("png")) return "png";
        if (normalized.contains("webp")) return "webp";
        return "png";
    }

    private String normalizeRelativePath(Path relativePath) {
        return relativePath.toString().replace("\\", "/");
    }

    private Trade findOwnedTrade(Long tradeId) {
        return trades.findByIdAndUserEmail(tradeId, currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trade not found"));
    }

    private String currentEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return auth.getName();
    }
}
