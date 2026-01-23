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
            @Positive BigDecimal stopLossPrice,
            @Positive BigDecimal takeProfitPrice,
            Instant closedAt
    ) {}
    public record TradeResponse(
            Long id,
            String symbol,
            String direction, 
            BigDecimal entryPrice,
            BigDecimal stopLossPrice,
            BigDecimal takeProfitPrice,
            Instant createdAt
    ) {
        static TradeResponse from(Trade t) {
            return new TradeResponse(
                    t.getId(),
                    t.getSymbol(),
                    t.getDirection(),
                    t.getEntryPrice(),
                    t.getStopLossPrice(),
                    t.getTakeProfitPrice(),
                    t.getCreatedAt()
            );
        }
    }

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
                    req.stopLossPrice(),
                    req.takeProfitPrice(),
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
                    req.stopLossPrice(),
                    req.takeProfitPrice(),
                    req.closedAt()
            )
    );
}
    @DeleteMapping("/{id}") 
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
