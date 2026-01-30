package com.example.tradingjournal.web;

import com.example.tradingjournal.model.Trade;
import com.example.tradingjournal.service.TradeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

    private final TradeService service;

    public TradeController(TradeService service) {
        this.service = service;
    }

    public record CreateTradeRequest(
            @NotBlank @Size(max = 20) String symbol,
            @NotBlank @Pattern(regexp = "(?i)LONG|SHORT") String direction,
            @NotNull @Positive BigDecimal entryPrice,
            @Positive BigDecimal exitPrice,
            @Pattern(regexp = "(?i)TP|SL|BREAKEVEN|MANUAL") String closeReasonOverride,
            @Size(max = 50) String manualReason,
            @Size(max = 500) String manualDescription,
            @Positive BigDecimal stopLossPrice,
            @Positive BigDecimal takeProfitPrice,
            BigDecimal commissionMoney,
            BigDecimal swapMoney,
            BigDecimal netPnlMoney,
            Instant createdAt,
            Instant closedAt
    ) {}
    public record TradeResponse(
            Long id,
            String symbol,
            String direction, 
            BigDecimal entryPrice,
            BigDecimal exitPrice,
            String closeReasonOverride,
            String manualReason,
            String manualDescription,
            String followedPlan,
            String mistakesText,
            String improvementText,
            Integer confidence,
            Instant reviewUpdatedAt,
            BigDecimal stopLossPrice,
            BigDecimal takeProfitPrice,
            BigDecimal commissionMoney,
            BigDecimal swapMoney,
            BigDecimal netPnlMoney,
            BigDecimal slPips,
            BigDecimal tpPips,
            BigDecimal rrRatio,
            Instant createdAt,
            Instant closedAt
    ) {
        static TradeResponse from(Trade t) {
            return new TradeResponse(
                    t.getId(),
                    t.getSymbol(),
                    t.getDirection(),
                    t.getEntryPrice(),
                    t.getExitPrice(),
                    t.getCloseReasonOverride(),
                    t.getManualReason(),
                    t.getManualDescription(),
                    t.getFollowedPlan(),
                    t.getMistakesText(),
                    t.getImprovementText(),
                    t.getConfidence(),
                    t.getReviewUpdatedAt(),
                    t.getStopLossPrice(),
                    t.getTakeProfitPrice(),
                    t.getCommissionMoney(),
                    t.getSwapMoney(),
                    t.getNetPnlMoney(),
                    t.getSlPips(),
                    t.getTpPips(),
                    t.getRrRatio(),
                    t.getCreatedAt(),
                    t.getClosedAt()
            );
        }
    }

    public record ReviewUpdateRequest(
            @NotBlank @Pattern(regexp = "(?i)YES|NO|MAYBE") String followedPlan,
            @Size(max = 2000) String mistakesText,
            @Size(max = 2000) String improvementText,
            @NotNull @Positive Integer confidence
    ) {}

    @GetMapping
    public List<TradeResponse> all() {
        return service.myTrades().stream().map(TradeResponse::from).toList();
    }

    @PostMapping
public TradeResponse create(@Valid @RequestBody CreateTradeRequest req) {
    return TradeResponse.from(
            service.create(
                    req.symbol(),
                    req.direction(),
                    req.entryPrice(),
                    req.exitPrice(),
                    req.closeReasonOverride(),
                    req.manualReason(),
                    req.manualDescription(),
                    req.stopLossPrice(),
                    req.takeProfitPrice(),
                    req.commissionMoney(),
                    req.swapMoney(),
                    req.netPnlMoney(),
                    req.closedAt() // usually null on create
            )
    );
}

    @PutMapping("/{id}")
public TradeResponse update(@PathVariable Long id, @Valid @RequestBody CreateTradeRequest req) {
    return TradeResponse.from(
            service.update(
                    id,
                    req.symbol(),
                    req.direction(),
                    req.entryPrice(),
                    req.exitPrice(),
                    req.closeReasonOverride(),
                    req.manualReason(),
                    req.manualDescription(),
                    req.stopLossPrice(),
                    req.takeProfitPrice(),
                    req.commissionMoney(),
                    req.swapMoney(),
                    req.netPnlMoney(),
                    req.closedAt(),
                    req.createdAt()
            )
    );
}

    @PatchMapping("/{id}/review")
    public TradeResponse updateReview(@PathVariable Long id, @Valid @RequestBody ReviewUpdateRequest req) {
        return TradeResponse.from(
                service.updateReview(
                        id,
                        req.followedPlan(),
                        req.mistakesText(),
                        req.improvementText(),
                        req.confidence()
                )
        );
    }
    @DeleteMapping("/{id}") 
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
