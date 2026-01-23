package com.example.tradingjournal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.tradingjournal.model.User;


import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
