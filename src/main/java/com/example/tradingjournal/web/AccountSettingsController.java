package com.example.tradingjournal.web;

import com.example.tradingjournal.model.AccountSettings;
import com.example.tradingjournal.service.AccountSettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

@RestController
@RequestMapping("/api/account-settings")
public class AccountSettingsController {

    private final AccountSettingsService service;

    public AccountSettingsController(AccountSettingsService service) {
        this.service = service;
    }

    public record AccountSettingsRequest(
            @NotNull @Positive BigDecimal startingBalance,
            @NotNull @Positive @DecimalMax("100.0") BigDecimal riskPercent,
            @Size(max = 5) String currency
    ) {}

    public record AccountSettingsResponse(
            Long id,
            BigDecimal startingBalance,
            BigDecimal riskPercent,
            String currency,
            Instant createdAt,
            Instant updatedAt
    ) {
        static AccountSettingsResponse from(AccountSettings settings) {
            return new AccountSettingsResponse(
                    settings.getId(),
                    settings.getStartingBalance(),
                    settings.getRiskPercent(),
                    settings.getCurrency(),
                    settings.getCreatedAt(),
                    settings.getUpdatedAt()
            );
        }
    }

    @GetMapping
    public AccountSettingsResponse get() {
        return service.getCurrentUserSettings()
                .map(AccountSettingsResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account settings not found"));
    }

    @PutMapping
    public AccountSettingsResponse upsert(@Valid @RequestBody AccountSettingsRequest request) {
        return AccountSettingsResponse.from(
                service.upsert(request.startingBalance(), request.riskPercent(), request.currency())
        );
    }
}
