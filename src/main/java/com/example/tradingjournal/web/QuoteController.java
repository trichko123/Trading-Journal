package com.example.tradingjournal.web;

import com.example.tradingjournal.service.FinnhubQuoteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@RestController
@RequestMapping("/api/quote")
public class QuoteController {

    private static final String API_KEY_ENV = "FINNHUB_API_KEY";
    private static final Set<String> SUPPORTED_PAIRS = Set.of(
            "EURUSD",
            "GBPJPY",
            "USDJPY",
            "USDCHF"
    );

    private final FinnhubQuoteService finnhubQuoteService;

    public QuoteController(FinnhubQuoteService finnhubQuoteService) {
        this.finnhubQuoteService = finnhubQuoteService;
    }

    public record QuoteResponse(
            String pair,
            String base,
            String quote,
            Number price,
            String source,
            long timestamp
    ) {}

    @GetMapping("/test")
    public QuoteResponse testQuote(@RequestParam String pair) {
        String normalized = pair == null ? "" : pair.trim().toUpperCase();
        if (!SUPPORTED_PAIRS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported pair: " + pair);
        }
        if (normalized.length() != 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pair format: " + pair);
        }

        String apiKey = System.getenv(API_KEY_ENV);
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Finnhub API key missing");
        }

        String base = normalized.substring(0, 3);
        String quote = normalized.substring(3, 6);
        FinnhubQuoteService.QuoteResult result = finnhubQuoteService.fetchQuote(apiKey, base, quote);

        return new QuoteResponse(
                normalized,
                base,
                quote,
                result.price(),
                "finnhub",
                result.timestamp()
        );
    }
}
