package com.example.tradingjournal.web;

import com.example.tradingjournal.model.TradeAttachment;
import com.example.tradingjournal.model.TradeAttachmentSection;
import com.example.tradingjournal.service.TradeAttachmentService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestController
public class TradeAttachmentController {
    private final TradeAttachmentService service;

    public TradeAttachmentController(TradeAttachmentService service) {
        this.service = service;
    }

    public record AttachmentResponse(
            Long id,
            Long tradeId,
            TradeAttachmentSection section,
            String originalFilename,
            String contentType,
            long fileSize,
            String imageUrl,
            String timeframe,
            Instant createdAt
    ) {
        static AttachmentResponse from(TradeAttachment attachment) {
            return new AttachmentResponse(
                    attachment.getId(),
                    attachment.getTrade().getId(),
                    attachment.getSection(),
                    attachment.getOriginalFilename(),
                    attachment.getContentType(),
                    attachment.getFileSize(),
                    "/uploads/" + attachment.getRelativePath(),
                    attachment.getTimeframe(),
                    attachment.getCreatedAt()
            );
        }
    }

    public record AttachmentUpdateRequest(String timeframe) {
    }

    @PostMapping(value = "/api/trades/{tradeId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AttachmentResponse upload(
            @PathVariable Long tradeId,
            @RequestParam @NotBlank String section,
            @RequestParam("file") MultipartFile file
    ) {
        TradeAttachmentSection parsed = parseSection(section);
        TradeAttachment attachment = service.create(tradeId, parsed, file);
        return AttachmentResponse.from(attachment);
    }

    @GetMapping("/api/trades/{tradeId}/attachments")
    public List<AttachmentResponse> list(@PathVariable Long tradeId) {
        return service.listForTrade(tradeId).stream()
                .map(AttachmentResponse::from)
                .toList();
    }

    @DeleteMapping("/api/attachments/{attachmentId}")
    public void delete(@PathVariable Long attachmentId) {
        service.delete(attachmentId);
    }

    @PatchMapping("/api/attachments/{attachmentId}")
    public AttachmentResponse updateTimeframe(
            @PathVariable Long attachmentId,
            @RequestBody AttachmentUpdateRequest request
    ) {
        String normalized = normalizeTimeframe(request == null ? null : request.timeframe());
        TradeAttachment updated = service.updateTimeframe(attachmentId, normalized);
        return AttachmentResponse.from(updated);
    }

    private TradeAttachmentSection parseSection(String section) {
        if (section == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section is required");
        }
        try {
            return TradeAttachmentSection.valueOf(section.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid section value");
        }
    }

    private String normalizeTimeframe(String timeframe) {
        if (timeframe == null) {
            return null;
        }
        String trimmed = timeframe.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timeframe is too long");
        }
        return trimmed;
    }
}
