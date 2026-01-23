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

    public TradeServiceImpl(TradeRepository trades, UserRepository users) {
        this.trades = trades;
        this.users = users;
    }

    private User currentUser() {
        return users.findByEmail(currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @Override
    public Trade create(String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, Instant closedAt) {
        validateTradeInput(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
        Metrics metrics = computeMetrics(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);

        Trade t = new Trade();
        t.setSymbol(normalizeSymbol(symbol));
        t.setDirection(direction.toUpperCase());
        t.setEntryPrice(entryPrice);
        t.setStopLossPrice(stopLossPrice);
        t.setTakeProfitPrice(takeProfitPrice);
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
        return trades.findAllByUserEmailOrderByCreatedAtDesc(currentEmail());
    }

    @Override
    public Trade findById(Long id) {
        return findOwnedTrade(id);
    }

    @Override
    public Trade update(Long id, String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, Instant closedAt, Instant createdAt) {
        validateTradeInput(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
        Metrics metrics = computeMetrics(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);

        Trade t = findOwnedTrade(id);
        Instant createdAtToUse = createdAt != null ? createdAt : t.getCreatedAt();
        if (createdAtToUse == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Created time is required");
        }
        t.setSymbol(normalizeSymbol(symbol));
        t.setDirection(direction.toUpperCase());
        t.setEntryPrice(entryPrice);
        t.setStopLossPrice(stopLossPrice);
        t.setTakeProfitPrice(takeProfitPrice);
        t.setSlPips(metrics.slPips());
        t.setTpPips(metrics.tpPips());
        t.setRrRatio(metrics.rrRatio());
        t.setPipSizeUsed(metrics.pipSizeUsed());
        t.setCreatedAt(createdAtToUse);
        t.setClosedAt(closedAt);

        return trades.save(t);
    }

    @Override
    public void delete(Long id) {
        Trade t = findOwnedTrade(id);
        trades.delete(t);
    }

    @Override
    public List<Trade> findAll() {
        return trades.findAll();
    }

    private void validateTradeInput(String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice) {
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
        if (stopLossPrice != null && stopLossPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stop loss price must be positive");
        }
        if (takeProfitPrice != null && takeProfitPrice.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Take profit price must be positive");
        }
        if (stopLossPrice != null || takeProfitPrice != null) {
            if (stopLossPrice == null || takeProfitPrice == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stop Loss and Take Profit must both be provided to calculate pips and RR");
            }
            validateOrdering(direction, entryPrice, stopLossPrice, takeProfitPrice);
        }
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
        if (stopLossPrice == null || takeProfitPrice == null) {
            return Metrics.empty();
        }

        BigDecimal pipSize = pipSizeForSymbol(symbol);
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

        BigDecimal slPips = entryPrice.subtract(stopLossPrice).abs()
                .divide(pipSize, 4, RoundingMode.HALF_UP)
                .setScale(1, RoundingMode.HALF_UP);
        BigDecimal tpPips = takeProfitPrice.subtract(entryPrice).abs()
                .divide(pipSize, 4, RoundingMode.HALF_UP)
                .setScale(1, RoundingMode.HALF_UP);
        BigDecimal rrRatio = reward
                .divide(risk, 4, RoundingMode.HALF_UP)
                .setScale(2, RoundingMode.HALF_UP);

        return new Metrics(slPips, tpPips, rrRatio, pipSize.setScale(4, RoundingMode.HALF_UP));
    }

    private BigDecimal pipSizeForSymbol(String symbol) {
        if (symbol != null && symbol.trim().toUpperCase().endsWith("JPY")) {
            return new BigDecimal("0.01");
        }
        return new BigDecimal("0.0001");
    }

    private record Metrics(BigDecimal slPips, BigDecimal tpPips, BigDecimal rrRatio, BigDecimal pipSizeUsed) {
        static Metrics empty() {
            return new Metrics(null, null, null, null);
        }
    }
}
