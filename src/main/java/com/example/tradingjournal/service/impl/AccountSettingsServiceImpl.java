package com.example.tradingjournal.service.impl;

import com.example.tradingjournal.model.AccountSettings;
import com.example.tradingjournal.model.User;
import com.example.tradingjournal.repository.AccountSettingsRepository;
import com.example.tradingjournal.repository.UserRepository;
import com.example.tradingjournal.service.AccountSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

@Service
public class AccountSettingsServiceImpl implements AccountSettingsService {

    private final AccountSettingsRepository settings;
    private final UserRepository users;

    public AccountSettingsServiceImpl(AccountSettingsRepository settings, UserRepository users) {
        this.settings = settings;
        this.users = users;
    }

    @Override
    public Optional<AccountSettings> getCurrentUserSettings() {
        User user = currentUser();
        return settings.findByUserId(user.getId());
    }

    @Override
    public AccountSettings upsert(BigDecimal startingBalance, BigDecimal riskPercent, String currency) {
        validateInputs(startingBalance, riskPercent);
        User user = currentUser();
        AccountSettings accountSettings = settings.findByUserId(user.getId()).orElseGet(AccountSettings::new);
        Instant now = Instant.now();
        if (accountSettings.getId() == null) {
            accountSettings.setUser(user);
            accountSettings.setCreatedAt(now);
        }
        accountSettings.setStartingBalance(startingBalance);
        accountSettings.setRiskPercent(riskPercent);
        accountSettings.setCurrency(normalizeCurrency(currency));
        accountSettings.setUpdatedAt(now);
        return settings.save(accountSettings);
    }

    private void validateInputs(BigDecimal startingBalance, BigDecimal riskPercent) {
        if (startingBalance == null || startingBalance.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Starting balance must be positive");
        }
        if (riskPercent == null || riskPercent.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Risk percent must be positive");
        }
        if (riskPercent.compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Risk percent must be 100 or less");
        }
    }

    private String normalizeCurrency(String currency) {
        if (currency == null) return null;
        String trimmed = currency.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase();
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
