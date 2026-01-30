package com.example.tradingjournal.service;

import com.example.tradingjournal.model.TradeAttachment;
import com.example.tradingjournal.model.TradeAttachmentSection;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TradeAttachmentService {
    TradeAttachment create(Long tradeId, TradeAttachmentSection section, MultipartFile file);
    List<TradeAttachment> listForTrade(Long tradeId);
    TradeAttachment updateTimeframe(Long attachmentId, String timeframe);
    void delete(Long attachmentId);
    void deleteByTradeId(Long tradeId);
}
