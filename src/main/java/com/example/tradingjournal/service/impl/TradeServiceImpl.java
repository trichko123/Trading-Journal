package com.example.tradingjournal.service.impl;

import com.example.tradingjournal.model.Trade;
import com.example.tradingjournal.model.User;
import com.example.tradingjournal.repository.TradeRepository;
import com.example.tradingjournal.repository.UserRepository;
import com.example.tradingjournal.service.TradeService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
public class TradeServiceImpl implements TradeService {

    private final TradeRepository trades;
    private final UserRepository users;
    private final com.example.tradingjournal.service.TradeAttachmentService attachments;

    public TradeServiceImpl(TradeRepository trades, UserRepository users, com.example.tradingjournal.service.TradeAttachmentService attachments) {
        this.trades = trades;
        this.users = users;
        this.attachments = attachments;
    }

    private User currentUser() {
        return users.findByEmail(currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @Override
    public Trade create(String symbol, String direction, BigDecimal entryPrice, BigDecimal exitPrice, String closeReasonOverride, String manualReason, String manualDescription, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, BigDecimal commissionMoney, BigDecimal swapMoney, BigDecimal netPnlMoney, Instant closedAt) {
        if (closedAt == null) {
            exitPrice = null;
        }
        validateTradeInput(symbol, direction, entryPrice, exitPrice, stopLossPrice, takeProfitPrice);
        validateBrokerFields(commissionMoney, swapMoney, netPnlMoney);
        validateClosedTrade(exitPrice, closedAt);
        Metrics metrics = computeMetrics(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
        String normalizedCloseReason = normalizeCloseReason(closeReasonOverride);
        ManualDetails manualDetails = normalizeManualDetails(normalizedCloseReason, manualReason, manualDescription);

        Trade t = new Trade();
        t.setSymbol(normalizeSymbol(symbol));
        t.setDirection(direction.toUpperCase());
        t.setEntryPrice(entryPrice);
        t.setExitPrice(exitPrice);
        t.setCloseReasonOverride(normalizedCloseReason);
        t.setManualReason(manualDetails.manualReason());
        t.setManualDescription(manualDetails.manualDescription());
        t.setStopLossPrice(stopLossPrice);
        t.setTakeProfitPrice(takeProfitPrice);
        t.setCommissionMoney(commissionMoney);
        t.setSwapMoney(swapMoney);
        t.setNetPnlMoney(netPnlMoney);
        t.setSlPips(metrics.slPips());
        t.setTpPips(metrics.tpPips());
        t.setRrRatio(metrics.rrRatio());
        t.setPipSizeUsed(metrics.pipSizeUsed());
        t.setCreatedAt(Instant.now());
        t.setClosedAt(closedAt);
        t.setUser(currentUser());
        return trades.save(t);
    }

    private String currentEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return auth.getName();
    }

    @Override
    public List<Trade> myTrades() {
        return trades.findAllByUserEmailOrderByCreatedAtDescIdDesc(currentEmail());
    }

    @Override
    public Trade findById(Long id) {
        return findOwnedTrade(id);
    }

    @Override
    public Trade update(Long id, String symbol, String direction, BigDecimal entryPrice, BigDecimal exitPrice, String closeReasonOverride, String manualReason, String manualDescription, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, BigDecimal commissionMoney, BigDecimal swapMoney, BigDecimal netPnlMoney, Instant closedAt, Instant createdAt) {
        if (closedAt == null) {
            exitPrice = null;
        }
        validateTradeInput(symbol, direction, entryPrice, exitPrice, stopLossPrice, takeProfitPrice);
        validateBrokerFields(commissionMoney, swapMoney, netPnlMoney);
        validateClosedTrade(exitPrice, closedAt);
        Metrics metrics = computeMetrics(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);

        Trade t = findOwnedTrade(id);
        Instant createdAtToUse = createdAt != null ? createdAt : t.getCreatedAt();
        if (createdAtToUse == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Created time is required");
        }
        t.setSymbol(normalizeSymbol(symbol));
        t.setDirection(direction.toUpperCase());
        t.setEntryPrice(entryPrice);
        t.setExitPrice(exitPrice);
        String normalizedCloseReason = null;
        if (closeReasonOverride != null) {
            normalizedCloseReason = normalizeCloseReason(closeReasonOverride);
            t.setCloseReasonOverride(normalizedCloseReason);
        }
        if (closeReasonOverride != null || manualReason != null || manualDescription != null) {
            if (closeReasonOverride == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Close reason is required when manual details are provided");
            }
            ManualDetails manualDetails = normalizeManualDetails(normalizedCloseReason, manualReason, manualDescription);
            t.setManualReason(manualDetails.manualReason());
            t.setManualDescription(manualDetails.manualDescription());
        }
        t.setStopLossPrice(stopLossPrice);
        t.setTakeProfitPrice(takeProfitPrice);
        t.setCommissionMoney(commissionMoney);
        t.setSwapMoney(swapMoney);
        t.setNetPnlMoney(netPnlMoney);
        t.setSlPips(metrics.slPips());
        t.setTpPips(metrics.tpPips());
        t.setRrRatio(metrics.rrRatio());
        t.setPipSizeUsed(metrics.pipSizeUsed());
        t.setCreatedAt(createdAtToUse);
        t.setClosedAt(closedAt);

        return trades.save(t);
    }

    @Override
    public Trade updateReview(Long id, String followedPlan, String mistakesText, String improvementText, Integer confidence) {
        Trade t = findOwnedTrade(id);
        String normalizedFollowedPlan = normalizeFollowedPlan(followedPlan);
        if (normalizedFollowedPlan == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Followed plan is required");
        }
        if (confidence == null || confidence < 1 || confidence > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confidence must be between 1 and 10");
        }
        t.setFollowedPlan(normalizedFollowedPlan);
        t.setMistakesText(normalizeOptionalText(mistakesText));
        t.setImprovementText(normalizeOptionalText(improvementText));
        t.setConfidence(confidence);
        t.setReviewUpdatedAt(Instant.now());
        return trades.save(t);
    }

    @Override
    public void delete(Long id) {
        Trade t = findOwnedTrade(id);
        attachments.deleteByTradeId(t.getId());
        trades.delete(t);
    }

    @Override
    public List<Trade> findAll() {
        return trades.findAll();
    }

    private void validateTradeInput(String symbol, String direction, BigDecimal entryPrice, BigDecimal exitPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice) {
        if (symbol == null || symbol.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Symbol is required");
        }
        if (symbol.trim().length() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Symbol must be at most 20 characters");
        }
        if (direction == null || (!direction.equalsIgnoreCase("LONG") && !direction.equalsIgnoreCase("SHORT"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Direction must be LONG or SHORT");
        }
        if (entryPrice == null || entryPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Entry price must be positive");
        }
        if (exitPrice != null && exitPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exit price must be positive");
        }
        if (stopLossPrice != null && stopLossPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stop loss price must be positive");
        }
        if (takeProfitPrice != null && takeProfitPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Take profit price must be positive");
        }
        if (stopLossPrice != null) {
            if (direction.equalsIgnoreCase("LONG") && stopLossPrice.compareTo(entryPrice) >= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For LONG, Stop Loss must be below Entry");
            }
            if (direction.equalsIgnoreCase("SHORT") && stopLossPrice.compareTo(entryPrice) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For SHORT, Stop Loss must be above Entry");
            }
        }
        if (takeProfitPrice != null) {
            if (direction.equalsIgnoreCase("LONG") && takeProfitPrice.compareTo(entryPrice) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For LONG, Take Profit must be above Entry");
            }
            if (direction.equalsIgnoreCase("SHORT") && takeProfitPrice.compareTo(entryPrice) >= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For SHORT, Take Profit must be below Entry");
            }
        }
        if (stopLossPrice != null && takeProfitPrice != null) {
            validateOrdering(direction, entryPrice, stopLossPrice, takeProfitPrice);
        }
    }

    private void validateClosedTrade(BigDecimal exitPrice, Instant closedAt) {
        if (closedAt != null) {
            if (exitPrice == null || exitPrice.signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exit price must be positive when closing a trade");
            }
        }
    }

    private void validateBrokerFields(BigDecimal commissionMoney, BigDecimal swapMoney, BigDecimal netPnlMoney) {
        if (commissionMoney != null && commissionMoney.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Commission must be zero or positive");
        }
    }

    private String normalizeCloseReason(String closeReasonOverride) {
        if (closeReasonOverride == null) return null;
        String trimmed = closeReasonOverride.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeFollowedPlan(String followedPlan) {
        if (followedPlan == null) return null;
        String trimmed = followedPlan.trim();
        if (trimmed.isEmpty()) return null;
        String upper = trimmed.toUpperCase();
        if (!upper.equals("YES") && !upper.equals("NO") && !upper.equals("MAYBE")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Followed plan must be YES, NO, or MAYBE");
        }
        return upper;
    }

    private ManualDetails normalizeManualDetails(String closeReasonOverride, String manualReason, String manualDescription) {
        if (closeReasonOverride == null || !closeReasonOverride.equalsIgnoreCase("MANUAL")) {
            return ManualDetails.empty();
        }
        String normalizedManualReason = normalizeOptionalText(manualReason);
        if (normalizedManualReason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual reason is required when close reason is Manual");
        }
        String normalizedDescription = normalizeOptionalText(manualDescription);
        if (normalizedManualReason.equalsIgnoreCase("OTHER")) {
            if (normalizedDescription == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is required when manual reason is Other");
            }
        } else {
            normalizedDescription = null;
        }
        return new ManualDetails(normalizedManualReason, normalizedDescription);
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Trade findOwnedTrade(Long id) {
        return trades.findByIdAndUserEmail(id, currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trade not found"));
    }

    private String normalizeSymbol(String symbol) {
        return symbol.trim().toUpperCase();
    }

    private void validateOrdering(String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice) {
        if (direction.equalsIgnoreCase("LONG")) {
            if (stopLossPrice.compareTo(entryPrice) >= 0 || takeProfitPrice.compareTo(entryPrice) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For LONG, Stop Loss must be below Entry and Take Profit above Entry");
            }
        } else {
            if (stopLossPrice.compareTo(entryPrice) <= 0 || takeProfitPrice.compareTo(entryPrice) >= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "For SHORT, Stop Loss must be above Entry and Take Profit below Entry");
            }
        }
    }

    private Metrics computeMetrics(String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice) {
        if (stopLossPrice == null && takeProfitPrice == null) {
            return Metrics.empty();
        }

        BigDecimal pipSize = pipSizeForSymbol(symbol);
        BigDecimal slPips = null;
        BigDecimal tpPips = null;
        BigDecimal rrRatio = null;

        if (stopLossPrice != null) {
            slPips = entryPrice.subtract(stopLossPrice).abs()
                    .divide(pipSize, 4, RoundingMode.HALF_UP)
                    .setScale(1, RoundingMode.HALF_UP);
        }

        if (takeProfitPrice != null) {
            tpPips = takeProfitPrice.subtract(entryPrice).abs()
                    .divide(pipSize, 4, RoundingMode.HALF_UP)
                    .setScale(1, RoundingMode.HALF_UP);
        }

        if (stopLossPrice != null && takeProfitPrice != null) {
            BigDecimal risk;
            BigDecimal reward;

            if (direction.equalsIgnoreCase("LONG")) {
                risk = entryPrice.subtract(stopLossPrice);
                reward = takeProfitPrice.subtract(entryPrice);
            } else {
                risk = stopLossPrice.subtract(entryPrice);
                reward = entryPrice.subtract(takeProfitPrice);
            }

            if (risk.signum() <= 0 || reward.signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Risk and reward must be positive based on Entry/SL/TP ordering");
            }

            rrRatio = reward
                    .divide(risk, 4, RoundingMode.HALF_UP)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return new Metrics(slPips, tpPips, rrRatio, pipSize.setScale(4, RoundingMode.HALF_UP));
    }

    private BigDecimal pipSizeForSymbol(String symbol) {
        if (symbol == null) {
            return new BigDecimal("0.0001");
        }
        String normalized = symbol.trim().toUpperCase();
        if ("XAUUSD".equals(normalized)) {
            return new BigDecimal("0.01");
        }
        if (normalized.endsWith("JPY")) {
            return new BigDecimal("0.01");
        }
        return new BigDecimal("0.0001");
    }

    private record Metrics(BigDecimal slPips, BigDecimal tpPips, BigDecimal rrRatio, BigDecimal pipSizeUsed) {
        static Metrics empty() {
            return new Metrics(null, null, null, null);
        }
    }

    private record ManualDetails(String manualReason, String manualDescription) {
        static ManualDetails empty() {
            return new ManualDetails(null, null);
        }
    }
}
