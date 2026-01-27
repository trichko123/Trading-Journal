package com.example.tradingjournal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Service
public class FinnhubQuoteService {

    private static final String FINNHUB_BASE_URL = "https://finnhub.io/api/v1/forex/rates";
    // NOTE: Finnhub returns rates for a base currency; we use base=USD to derive cross rates.
    private static final String BASE_CURRENCY = "USD";
    private static final MathContext MATH_CONTEXT = MathContext.DECIMAL64;
    private static final Logger logger = LoggerFactory.getLogger(FinnhubQuoteService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public FinnhubQuoteService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();
    }

    public QuoteResult fetchQuote(String apiKey, String baseCurrency, String quoteCurrency) {
        String token = apiKey == null ? "" : apiKey.trim();
        boolean hasToken = !token.isEmpty();
        logger.info("Finnhub token present? {} length={}", hasToken, token.length());

        String url = FINNHUB_BASE_URL + "?base=" + BASE_CURRENCY + "&token=" + token;
        logger.info("Finnhub request URL: {}", redactToken(url));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Finnhub request failed: " + ex.getMessage());
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            logger.warn("Finnhub non-200 status={} body={}", response.statusCode(), response.body());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Finnhub error: " + response.statusCode());
        }

        FinnhubRatesResponse rates;
        try {
            rates = objectMapper.readValue(response.body(), FinnhubRatesResponse.class);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Finnhub response parse failed");
        }

        if (rates == null || rates.quote() == null || rates.quote().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Finnhub response missing rates");
        }

        BigDecimal price = computeRateFromUsdBase(rates.quote(), baseCurrency, quoteCurrency);
        if (price == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Finnhub missing rate for pair");
        }

        return new QuoteResult(price, System.currentTimeMillis());
    }

    private BigDecimal computeRateFromUsdBase(Map<String, BigDecimal> usdRates, String baseCurrency, String quoteCurrency) {
        // Finnhub base=USD returns map like USD -> {EUR: x}, meaning 1 USD = x EUR.
        if (BASE_CURRENCY.equals(baseCurrency)) {
            return usdRates.get(quoteCurrency);
        }
        if (BASE_CURRENCY.equals(quoteCurrency)) {
            // Example EURUSD = 1 / (USD->EUR) because 1 EUR = USD amount.
            BigDecimal usdToBase = usdRates.get(baseCurrency);
            if (usdToBase == null || usdToBase.compareTo(BigDecimal.ZERO) == 0) return null;
            return BigDecimal.ONE.divide(usdToBase, MATH_CONTEXT);
        }
        // Cross-rate via USD: (USD->quote) / (USD->base)
        BigDecimal usdToBase = usdRates.get(baseCurrency);
        BigDecimal usdToQuote = usdRates.get(quoteCurrency);
        if (usdToBase == null || usdToQuote == null || usdToBase.compareTo(BigDecimal.ZERO) == 0) return null;
        return usdToQuote.divide(usdToBase, MATH_CONTEXT);
    }

    public record QuoteResult(BigDecimal price, long timestamp) {}

    public record FinnhubRatesResponse(String base, Map<String, BigDecimal> quote) {}

    private String redactToken(String url) {
        int idx = url.indexOf("token=");
        if (idx < 0) return url;
        int end = url.indexOf('&', idx);
        if (end < 0) {
            return url.substring(0, idx) + "token=***";
        }
        return url.substring(0, idx) + "token=***" + url.substring(end);
    }
}
