package com.example.tradingjournal.service;

import com.example.tradingjournal.model.Cashflow;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface CashflowService {

    Cashflow create(String type, BigDecimal amountMoney, Instant occurredAt, String note);
    Cashflow update(Long id, String type, BigDecimal amountMoney, Instant occurredAt, String note);
    void delete(Long id);
    List<Cashflow> myCashflows();
    Cashflow findById(Long id);
}
