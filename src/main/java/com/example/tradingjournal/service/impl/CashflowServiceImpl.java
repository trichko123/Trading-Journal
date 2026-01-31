package com.example.tradingjournal.service.impl;

import com.example.tradingjournal.model.Cashflow;
import com.example.tradingjournal.model.User;
import com.example.tradingjournal.repository.CashflowRepository;
import com.example.tradingjournal.repository.UserRepository;
import com.example.tradingjournal.service.CashflowService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class CashflowServiceImpl implements CashflowService {

    private final CashflowRepository cashflows;
    private final UserRepository users;

    public CashflowServiceImpl(CashflowRepository cashflows, UserRepository users) {
        this.cashflows = cashflows;
        this.users = users;
    }

    @Override
    public Cashflow create(String type, BigDecimal amountMoney, Instant occurredAt, String note) {
        validateType(type);
        validateAmount(amountMoney);
        Instant occurredAtToUse = occurredAt != null ? occurredAt : Instant.now();
        Cashflow cashflow = new Cashflow();
        cashflow.setUser(currentUser());
        cashflow.setType(type.trim().toUpperCase());
        cashflow.setAmountMoney(amountMoney);
        cashflow.setOccurredAt(occurredAtToUse);
        cashflow.setNote(normalizeNote(note));
        cashflow.setCreatedAt(Instant.now());
        return cashflows.save(cashflow);
    }

    @Override
    public Cashflow update(Long id, String type, BigDecimal amountMoney, Instant occurredAt, String note) {
        if (occurredAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Occurred time is required");
        }
        validateType(type);
        validateAmount(amountMoney);
        Cashflow cashflow = findOwnedCashflow(id);
        cashflow.setType(type.trim().toUpperCase());
        cashflow.setAmountMoney(amountMoney);
        cashflow.setOccurredAt(occurredAt);
        cashflow.setNote(normalizeNote(note));
        return cashflows.save(cashflow);
    }

    @Override
    public void delete(Long id) {
        Cashflow cashflow = findOwnedCashflow(id);
        cashflows.delete(cashflow);
    }

    @Override
    public List<Cashflow> myCashflows() {
        return cashflows.findAllByUserEmailOrderByOccurredAtDescIdDesc(currentEmail());
    }

    @Override
    public Cashflow findById(Long id) {
        return findOwnedCashflow(id);
    }

    private void validateType(String type) {
        if (type == null || type.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type is required");
        }
        String normalized = type.trim().toUpperCase();
        if (!normalized.equals("DEPOSIT") && !normalized.equals("WITHDRAWAL")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type must be DEPOSIT or WITHDRAWAL");
        }
    }

    private void validateAmount(BigDecimal amountMoney) {
        if (amountMoney == null || amountMoney.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
        }
    }

    private String normalizeNote(String note) {
        if (note == null) return null;
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Cashflow findOwnedCashflow(Long id) {
        return cashflows.findByIdAndUserEmail(id, currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cashflow not found"));
    }

    private User currentUser() {
        return users.findByEmail(currentEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private String currentEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return auth.getName();
    }
}
