package com.example.tradingjournal.service;

import com.example.tradingjournal.model.AccountSettings;

import java.math.BigDecimal;
import java.util.Optional;

public interface AccountSettingsService {
    Optional<AccountSettings> getCurrentUserSettings();
    AccountSettings upsert(BigDecimal startingBalance, BigDecimal riskPercent, String currency);
}
