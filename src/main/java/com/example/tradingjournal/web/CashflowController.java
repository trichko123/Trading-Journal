package com.example.tradingjournal.web;

import com.example.tradingjournal.model.Cashflow;
import com.example.tradingjournal.service.CashflowService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/cashflows")
public class CashflowController {

    private final CashflowService service;

    public CashflowController(CashflowService service) {
        this.service = service;
    }

    public record CashflowRequest(
            @NotBlank @Pattern(regexp = "(?i)DEPOSIT|WITHDRAWAL") String type,
            @NotNull @Positive BigDecimal amountMoney,
            Instant occurredAt,
            @Size(max = 500) String note
    ) {}

    public record CashflowResponse(
            Long id,
            String type,
            BigDecimal amountMoney,
            Instant occurredAt,
            String note,
            Instant createdAt
    ) {
        static CashflowResponse from(Cashflow cashflow) {
            return new CashflowResponse(
                    cashflow.getId(),
                    cashflow.getType(),
                    cashflow.getAmountMoney(),
                    cashflow.getOccurredAt(),
                    cashflow.getNote(),
                    cashflow.getCreatedAt()
            );
        }
    }

    @GetMapping
    public List<CashflowResponse> all() {
        return service.myCashflows().stream().map(CashflowResponse::from).toList();
    }

    @PostMapping
    public CashflowResponse create(@Valid @RequestBody CashflowRequest request) {
        return CashflowResponse.from(
                service.create(
                        request.type(),
                        request.amountMoney(),
                        request.occurredAt(),
                        request.note()
                )
        );
    }

    @PutMapping("/{id}")
    public CashflowResponse update(@PathVariable Long id, @Valid @RequestBody CashflowRequest request) {
        return CashflowResponse.from(
                service.update(
                        id,
                        request.type(),
                        request.amountMoney(),
                        request.occurredAt(),
                        request.note()
                )
        );
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
