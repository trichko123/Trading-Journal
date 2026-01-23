package com.example.tradingjournal.config;

import com.example.tradingjournal.model.User;
import com.example.tradingjournal.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DevDataSeeder {

    @Bean
    CommandLineRunner seedDefaultUser(UserRepository users, PasswordEncoder encoder) {
        return args -> {
            String rawPassword = "pass1234";
            
            // Seed first user: test@example.com
            String email1 = "test@example.com";
            if (!users.existsByEmail(email1)) {
                users.save(new User(email1, encoder.encode(rawPassword)));
                System.out.println("✅ Seeded default user: " + email1);
            } else {
                System.out.println("ℹ️ Default user already exists: " + email1);
            }
            
            // Seed second user: second@example.com
            String email2 = "second@example.com";
            if (!users.existsByEmail(email2)) {
                users.save(new User(email2, encoder.encode(rawPassword)));
                System.out.println("✅ Seeded second user: " + email2);
            } else {
                System.out.println("ℹ️ Second user already exists: " + email2);
            }
        };
    }
}
