package com.example.tradingjournal.repository;

import com.example.tradingjournal.model.TradeAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TradeAttachmentRepository extends JpaRepository<TradeAttachment, Long> {
    List<TradeAttachment> findAllByTradeIdOrderByCreatedAtDesc(Long tradeId);
    Optional<TradeAttachment> findByIdAndTradeUserEmail(Long id, String email);
}
