package com.example.tradingjournal.web;

import com.example.tradingjournal.model.User;
import com.example.tradingjournal.model.User.Provider;
import com.example.tradingjournal.repository.UserRepository;
import com.example.tradingjournal.security.GoogleTokenVerifier;
import com.example.tradingjournal.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuthenticationManager authManager, GoogleTokenVerifier googleTokenVerifier) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = authManager;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    public record RegisterRequest(String email, String password) {}
    public record LoginRequest(String email, String password) {}
    public record GoogleAuthRequest(String idToken) {}
    public record AuthResponse(String token) {}

    @PostMapping("/register")
    public void register(@RequestBody RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        User u = new User(req.email().trim().toLowerCase(), encoder.encode(req.password()));
        users.save(u);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password())
            );
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        String token = jwt.generateToken(req.email().trim().toLowerCase());
        return new AuthResponse(token);
    }

    @PostMapping("/google")
    public AuthResponse google(@RequestBody GoogleAuthRequest req) {
        var payload = googleTokenVerifier.verify(req.idToken());

        String googleSub = payload.getSubject();
        String email = payload.getEmail().trim().toLowerCase();
        String displayName = payload.get("name") instanceof String ? (String) payload.get("name") : null;
        String avatarUrl = payload.get("picture") instanceof String ? (String) payload.get("picture") : null;

        User user = users.findByGoogleSub(googleSub).orElse(null);
        if (user == null) {
            var byEmail = users.findByEmail(email).orElse(null);
            if (byEmail != null) {
                if (byEmail.getProvider() == Provider.GOOGLE) {
                    if (byEmail.getGoogleSub() == null || byEmail.getGoogleSub().isBlank()) {
                        byEmail.setGoogleSub(googleSub);
                    }
                    user = byEmail;
                } else {
                    // Safe default: avoid auto-linking to prevent account takeover.
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "This email is already registered. Please log in with email & password.");
                }
            } else {
                User created = new User(email, encoder.encode(java.util.UUID.randomUUID().toString()));
                created.setProvider(Provider.GOOGLE);
                created.setGoogleSub(googleSub);
                created.setDisplayName(displayName);
                created.setAvatarUrl(avatarUrl);
                user = created;
            }
        } else {
            if (user.getDisplayName() == null && displayName != null) {
                user.setDisplayName(displayName);
            }
            if (user.getAvatarUrl() == null && avatarUrl != null) {
                user.setAvatarUrl(avatarUrl);
            }
        }

        users.save(user);
        String token = jwt.generateToken(user.getEmail());
        return new AuthResponse(token);
    }
}
