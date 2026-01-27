package com.example.tradingjournal.service;

import com.example.tradingjournal.model.Trade;

import java.math.BigDecimal;
import java.util.List;

public interface TradeService {

    Trade create(String symbol, String direction, BigDecimal entryPrice, BigDecimal exitPrice, String closeReasonOverride, String manualReason, String manualDescription, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, java.time.Instant closedAt);
    List<Trade> myTrades();

    Trade findById(Long id);
    Trade update(Long id, String symbol, String direction, BigDecimal entryPrice, BigDecimal exitPrice, String closeReasonOverride, String manualReason, String manualDescription, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, java.time.Instant closedAt, java.time.Instant createdAt);
    Trade updateReview(Long id, String followedPlan, String mistakesText, String improvementText, Integer confidence);
    void delete(Long id);


    List<Trade> findAll();


}
