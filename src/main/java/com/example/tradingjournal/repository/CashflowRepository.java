package com.example.tradingjournal.repository;

import com.example.tradingjournal.model.Cashflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashflowRepository extends JpaRepository<Cashflow, Long> {
    List<Cashflow> findAllByUserEmailOrderByOccurredAtDescIdDesc(String email);
    Optional<Cashflow> findByIdAndUserEmail(Long id, String email);
}
