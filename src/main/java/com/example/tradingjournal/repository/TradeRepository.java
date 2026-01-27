package com.example.tradingjournal.repository;

import com.example.tradingjournal.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {
    List<Trade> findAllByUserEmailOrderByCreatedAtDescIdDesc(String email);
    Optional<Trade> findByIdAndUserEmail(Long id, String email);

}
