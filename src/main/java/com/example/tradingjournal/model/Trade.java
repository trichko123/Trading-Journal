package com.example.tradingjournal.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
public class Trade {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 20)
    private String symbol;
    @Column(nullable = false, length = 20)
    private String direction;
    private BigDecimal entryPrice;
    @Column(name = "exit_price")
    private BigDecimal exitPrice;
    private BigDecimal stopLossPrice;
    private BigDecimal takeProfitPrice;
    private BigDecimal slPips;
    private BigDecimal tpPips;
    private BigDecimal rrRatio;
    private BigDecimal pipSizeUsed;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "closed_at")
    private Instant closedAt;

    public Trade(String symbol, String direction, BigDecimal entryPrice1, Instant createdAt) {
        this.symbol = symbol;
        this.direction = direction;
        this.entryPrice = entryPrice1;
        this.createdAt = createdAt;
    }

    public Trade() {

    }
    public User getUser() {
        return user;
    }
    public void setUser(User user) {
        this.user = user;
    }


    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public BigDecimal getEntryPrice() {
        return entryPrice;
    }

    public void setEntryPrice(BigDecimal entryPrice) {
        this.entryPrice = entryPrice;
    }

    public BigDecimal getExitPrice() {
        return exitPrice;
    }

    public void setExitPrice(BigDecimal exitPrice) {
        this.exitPrice = exitPrice;
    }

    public BigDecimal getStopLossPrice() {
        return stopLossPrice;
    }

    public void setStopLossPrice(BigDecimal stopLossPrice) {
        this.stopLossPrice = stopLossPrice;
    }

    public BigDecimal getTakeProfitPrice() {
        return takeProfitPrice;
    }

    public void setTakeProfitPrice(BigDecimal takeProfitPrice) {
        this.takeProfitPrice = takeProfitPrice;
    }

    public BigDecimal getSlPips() {
        return slPips;
    }

    public void setSlPips(BigDecimal slPips) {
        this.slPips = slPips;
    }

    public BigDecimal getTpPips() {
        return tpPips;
    }

    public void setTpPips(BigDecimal tpPips) {
        this.tpPips = tpPips;
    }

    public BigDecimal getRrRatio() {
        return rrRatio;
    }

    public void setRrRatio(BigDecimal rrRatio) {
        this.rrRatio = rrRatio;
    }

    public BigDecimal getPipSizeUsed() {
        return pipSizeUsed;
    }

    public void setPipSizeUsed(BigDecimal pipSizeUsed) {
        this.pipSizeUsed = pipSizeUsed;
    }


}
