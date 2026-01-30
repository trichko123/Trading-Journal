package com.example.tradingjournal.repository;

import com.example.tradingjournal.model.AccountSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountSettingsRepository extends JpaRepository<AccountSettings, Long> {
    Optional<AccountSettings> findByUserId(Long userId);
}
