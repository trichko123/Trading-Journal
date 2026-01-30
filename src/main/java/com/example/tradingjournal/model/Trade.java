package com.example.tradingjournal.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "trades")
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
    @Column(name = "entry_price", precision = 18, scale = 8)
    private BigDecimal entryPrice;
    @Column(name = "exit_price", precision = 18, scale = 8)
    private BigDecimal exitPrice;
    @Column(name = "close_reason_override", length = 20)
    private String closeReasonOverride;
    @Column(name = "manual_reason", length = 50)
    private String manualReason;
    @Column(name = "manual_description", length = 500)
    private String manualDescription;
    @Column(name = "followed_plan", length = 10)
    private String followedPlan;
    @Column(name = "mistakes_text", length = 2000)
    private String mistakesText;
    @Column(name = "improvement_text", length = 2000)
    private String improvementText;
    @Column(name = "confidence")
    private Integer confidence;
    @Column(name = "review_updated_at")
    private Instant reviewUpdatedAt;
    @Column(name = "stop_loss_price", precision = 18, scale = 8)
    private BigDecimal stopLossPrice;
    @Column(name = "take_profit_price", precision = 18, scale = 8)
    private BigDecimal takeProfitPrice;
    @Column(name = "commission_money", precision = 18, scale = 2)
    private BigDecimal commissionMoney;
    @Column(name = "swap_money", precision = 18, scale = 2)
    private BigDecimal swapMoney;
    @Column(name = "net_pnl_money", precision = 18, scale = 2)
    private BigDecimal netPnlMoney;
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

    public String getCloseReasonOverride() {
        return closeReasonOverride;
    }

    public void setCloseReasonOverride(String closeReasonOverride) {
        this.closeReasonOverride = closeReasonOverride;
    }

    public String getManualReason() {
        return manualReason;
    }

    public void setManualReason(String manualReason) {
        this.manualReason = manualReason;
    }

    public String getManualDescription() {
        return manualDescription;
    }

    public void setManualDescription(String manualDescription) {
        this.manualDescription = manualDescription;
    }

    public String getFollowedPlan() {
        return followedPlan;
    }

    public void setFollowedPlan(String followedPlan) {
        this.followedPlan = followedPlan;
    }

    public String getMistakesText() {
        return mistakesText;
    }

    public void setMistakesText(String mistakesText) {
        this.mistakesText = mistakesText;
    }

    public String getImprovementText() {
        return improvementText;
    }

    public void setImprovementText(String improvementText) {
        this.improvementText = improvementText;
    }

    public Integer getConfidence() {
        return confidence;
    }

    public void setConfidence(Integer confidence) {
        this.confidence = confidence;
    }

    public Instant getReviewUpdatedAt() {
        return reviewUpdatedAt;
    }

    public void setReviewUpdatedAt(Instant reviewUpdatedAt) {
        this.reviewUpdatedAt = reviewUpdatedAt;
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

    public BigDecimal getCommissionMoney() {
        return commissionMoney;
    }

    public void setCommissionMoney(BigDecimal commissionMoney) {
        this.commissionMoney = commissionMoney;
    }

    public BigDecimal getSwapMoney() {
        return swapMoney;
    }

    public void setSwapMoney(BigDecimal swapMoney) {
        this.swapMoney = swapMoney;
    }

    public BigDecimal getNetPnlMoney() {
        return netPnlMoney;
    }

    public void setNetPnlMoney(BigDecimal netPnlMoney) {
        this.netPnlMoney = netPnlMoney;
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
