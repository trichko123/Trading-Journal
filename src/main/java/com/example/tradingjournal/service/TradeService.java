package com.example.tradingjournal.service;

import com.example.tradingjournal.model.Trade;

import java.math.BigDecimal;
import java.util.List;

public interface TradeService {

    Trade create(String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, java.time.Instant closedAt);
    List<Trade> myTrades();

    Trade findById(Long id);
    Trade update(Long id, String symbol, String direction, BigDecimal entryPrice, BigDecimal stopLossPrice, BigDecimal takeProfitPrice, java.time.Instant closedAt);
    void delete(Long id);


    List<Trade> findAll();


}
