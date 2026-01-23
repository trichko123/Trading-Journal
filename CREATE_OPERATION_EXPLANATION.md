# CREATE Operation - Complete Flow Explanation

This document explains how the CREATE operation for trades works in the Trading Journal application, from the frontend user interaction to the database storage.

---

## Table of Contents
1. [Overview](#overview)
2. [Frontend Layer (React)](#1-frontend-layer-react)
3. [HTTP Request & CORS](#2-http-request--cors)
4. [Security Layer (JWT Authentication)](#3-security-layer-jwt-authentication)
5. [Controller Layer](#4-controller-layer)
6. [Service Layer](#5-service-layer)
7. [Repository Layer](#6-repository-layer)
8. [Entity & Database Layer](#7-entity--database-layer)
9. [Complete Flow Diagram](#complete-flow-diagram)

---

## Overview

The CREATE operation allows authenticated users to create new trade entries. The flow involves:
- **Frontend**: React form submission
- **Security**: JWT token authentication
- **Controller**: REST endpoint handling
- **Service**: Business logic and validation
- **Repository**: Database persistence
- **Entity**: JPA entity mapping
- **Database**: H2/PostgreSQL storage

---

## 1. Frontend Layer (React)

**File**: `frontend/trading-journal-ui/src/App.jsx`

### User Interface Component
```javascript
const [symbol, setSymbol] = useState("GBPJPY");
const [direction, setDirection] = useState("LONG");
const [entryPrice, setEntryPrice] = useState("187.25");
const [token, setToken] = useState(localStorage.getItem("token") || "");
```

### Form Submission Handler
```javascript
async function createTrade(e) {
    e.preventDefault();
    setError("");

    try {
        const res = await fetch(`${API}/trades`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                symbol,
                direction,
                entryPrice: entryPrice === "" ? null : Number(entryPrice),
            }),
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Create trade failed (${res.status}): ${txt}`);
        }

        setEntryPrice("");
        await loadTrades();
    } catch (err) {
        setError(String(err));
    }
}
```

### Form UI
```javascript
<form onSubmit={createTrade} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
    <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" />
    <select value={direction} onChange={(e) => setDirection(e.target.value)}>
        <option value="LONG">LONG</option>
        <option value="SHORT">SHORT</option>
    </select>
    <input
        value={entryPrice}
        onChange={(e) => setEntryPrice(e.target.value)}
        placeholder="Entry price"
    />
    <button type="submit">Add trade</button>
</form>
```

**What happens here:**
1. User fills in symbol, direction, and entry price
2. User clicks "Add trade" button
3. `createTrade` function is triggered
4. HTTP POST request is sent to `http://localhost:8080/api/trades`
5. JWT token is included in `Authorization` header
6. Request body contains JSON with trade data

---

## 2. HTTP Request & CORS

### CORS Configuration
**File**: `src/main/java/com/example/tradingjournal/config/CorsConfig.java`

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173")); // Frontend URL
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false); // JWT in headers => false is fine

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

**What happens here:**
- Allows requests from `http://localhost:5173` (React dev server)
- Enables POST method for CREATE operations
- Allows all headers (including Authorization header)

---

## 3. Security Layer (JWT Authentication)

### Security Configuration
**File**: `src/main/java/com/example/tradingjournal/config/SecurityConfig.java`

```java
@Bean
@Order(1)
public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
    return http
            .securityMatcher("/api/**")
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .anyRequest().authenticated()  // ✅ Requires authentication for /api/trades
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
}
```

**What happens here:**
- All `/api/**` endpoints require authentication (except `/api/auth/**`)
- JWT filter is added before username/password filter
- Stateless session (no server-side sessions, using JWT only)

### JWT Authentication Filter
**File**: `src/main/java/com/example/tradingjournal/security/JwtAuthFilter.java`

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }

        String token = auth.substring(7); // Extract token after "Bearer "
        if (!jwt.isValid(token)) {
            chain.doFilter(req, res);
            return;
        }

        String email = jwt.extractEmail(token);
        UserDetails ud = userDetailsService.loadUserByUsername(email);

        var authentication = new UsernamePasswordAuthenticationToken(
                ud, null, ud.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        chain.doFilter(req, res);
    }
    
    @Override
    protected boolean shouldNotFilter(jakarta.servlet.http.HttpServletRequest request) {
        return request.getServletPath().startsWith("/api/auth/");
    }
}
```

**What happens here:**
1. Filter intercepts the request
2. Extracts JWT token from `Authorization: Bearer <token>` header
3. Validates the token using `JwtService`
4. Extracts email from token
5. Loads user details using `CustomUserDetailsService`
6. Sets authentication in Spring Security context
7. Continues filter chain (request proceeds to controller)

**If authentication fails:** Request is rejected with 401 Unauthorized

---

## 4. Controller Layer

**File**: `src/main/java/com/example/tradingjournal/web/TradeController.java`

### REST Controller
```java
@RestController
@RequestMapping("/api/trades")
public class TradeController {
    private final TradeService service;

    public TradeController(TradeService service) {
        this.service = service;
    }
```

### Request DTO (Data Transfer Object)
```java
public record CreateTradeRequest(
        @NotBlank @Size(max = 20) String symbol,
        @NotBlank @Pattern(regexp = "(?i)LONG|SHORT") String direction,
        @NotNull @Positive BigDecimal entryPrice
) {}
```

**Validation annotations:**
- `@NotBlank`: Symbol and direction cannot be null or empty
- `@Size(max = 20)`: Symbol must be at most 20 characters
- `@Pattern(regexp = "(?i)LONG|SHORT")`: Direction must be LONG or SHORT (case-insensitive)
- `@NotNull @Positive`: Entry price must be present and positive

### Response DTO
```java
public record TradeResponse(Long id, String symbol, String direction, BigDecimal entryPrice, LocalDateTime createdAt) {
    static TradeResponse from(Trade t) {
        return new TradeResponse(t.getId(), t.getSymbol(), t.getDirection(), t.getEntryPrice(), t.getCreatedAt());
    }
}
```

### CREATE Endpoint
```java
@PostMapping
public TradeResponse create(@Valid @RequestBody CreateTradeRequest req) {
    return TradeResponse.from(service.create(req.symbol(), req.direction(), req.entryPrice()));
}
```

**What happens here:**
1. `@PostMapping` handles POST requests to `/api/trades`
2. `@Valid` triggers Bean Validation on `CreateTradeRequest`
3. `@RequestBody` deserializes JSON body to `CreateTradeRequest` object
4. If validation fails: Returns 400 Bad Request with validation errors
5. If validation passes: Calls `service.create()` with extracted fields
6. Converts returned `Trade` entity to `TradeResponse` DTO
7. Returns JSON response to frontend

**Validation Flow:**
- Spring automatically validates `@Valid` annotated parameters
- If validation fails, `MethodArgumentNotValidException` is thrown
- Exception handler returns 400 with validation error details

---

## 5. Service Layer

### Service Interface
**File**: `src/main/java/com/example/tradingjournal/service/TradeService.java`

```java
public interface TradeService {
    Trade create(String symbol, String direction, BigDecimal entryPrice);
    // ... other methods
}
```

### Service Implementation
**File**: `src/main/java/com/example/tradingjournal/service/impl/TradeServiceImpl.java`

```java
@Service
public class TradeServiceImpl implements TradeService {
    private final TradeRepository trades;
    private final UserRepository users;

    public TradeServiceImpl(TradeRepository trades, UserRepository users) {
        this.trades = trades;
        this.users = users;
    }
```

### CREATE Method Implementation
```java
@Override
public Trade create(String symbol, String direction, BigDecimal entryPrice) {
    validateTradeInput(symbol, direction, entryPrice);

    Trade t = new Trade();
    t.setSymbol(normalizeSymbol(symbol));
    t.setDirection(direction.toUpperCase());
    t.setEntryPrice(entryPrice);
    t.setCreatedAt(LocalDateTime.now());
    t.setUser(currentUser());   // ✅ Sets the authenticated user
    return trades.save(t);
}
```

### Helper Methods

#### Get Current User
```java
private User currentUser() {
    return users.findByEmail(currentEmail())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
}

private String currentEmail() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
    return auth.getName(); // Email from JWT token (set by JwtAuthFilter)
}
```

**What happens:**
- Gets authentication from Spring Security context (set by JwtAuthFilter)
- Extracts email from authentication name
- Finds user by email in database
- Returns User entity or throws 401 if not found

#### Validation
```java
private void validateTradeInput(String symbol, String direction, BigDecimal entryPrice) {
    if (symbol == null || symbol.trim().isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Symbol is required");
    }
    if (symbol.trim().length() > 20) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Symbol must be at most 20 characters");
    }
    if (direction == null || (!direction.equalsIgnoreCase("LONG") && !direction.equalsIgnoreCase("SHORT"))) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Direction must be LONG or SHORT");
    }
    if (entryPrice == null || entryPrice.signum() <= 0) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Entry price must be positive");
    }
}
```

#### Symbol Normalization
```java
private String normalizeSymbol(String symbol) {
    return symbol.trim().toUpperCase();
}
```

**What happens in create() method:**
1. **Validates input**: Checks all fields meet business rules
2. **Creates new Trade entity**: Instantiates empty Trade object
3. **Sets fields**:
   - Symbol: Normalized (trimmed and uppercased)
   - Direction: Uppercased
   - Entry Price: Set directly
   - Created At: Current timestamp
   - User: Current authenticated user (from SecurityContext)
4. **Saves to database**: Calls repository save method
5. **Returns saved entity**: With generated ID

---

## 6. Repository Layer

### Trade Repository Interface
**File**: `src/main/java/com/example/tradingjournal/repository/TradeRepository.java`

```java
@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {
    List<Trade> findAllByUserEmailOrderByCreatedAtDesc(String email);
    Optional<Trade> findByIdAndUserEmail(Long id, String email);
}
```

**What this provides:**
- Extends `JpaRepository<Trade, Long>` which provides:
  - `save(T entity)` - Saves or updates entity
  - `findById(Long id)` - Finds by primary key
  - `delete(T entity)` - Deletes entity
  - `findAll()` - Gets all entities
- Custom query methods:
  - `findAllByUserEmailOrderByCreatedAtDesc` - Finds trades by user email
  - `findByIdAndUserEmail` - Finds trade owned by specific user

### Save Operation
When `trades.save(t)` is called:
1. Spring Data JPA checks if entity has ID:
   - **If ID is null**: Performs INSERT (CREATE operation)
   - **If ID exists**: Performs UPDATE
2. In this case, ID is null, so it performs INSERT
3. JPA generates SQL: `INSERT INTO trades (symbol, direction, entry_price, created_at, user_id) VALUES (?, ?, ?, ?, ?)`
4. Database generates ID (auto-increment)
5. Entity is updated with generated ID
6. Transaction is committed
7. Saved entity is returned

---

## 7. Entity & Database Layer

### Trade Entity
**File**: `src/main/java/com/example/tradingjournal/model/Trade.java`

```java
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
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // Constructors, getters, setters...
}
```

**JPA Annotations:**
- `@Entity`: Marks class as JPA entity
- `@Id`: Primary key
- `@GeneratedValue(strategy = GenerationType.IDENTITY)`: Auto-increment ID
- `@ManyToOne`: Relationship to User entity (many trades to one user)
- `@Column`: Maps to database column (nullable, length constraints)
- `@FetchType.LAZY`: Loads user only when accessed (performance optimization)

### User Entity
**File**: `src/main/java/com/example/tradingjournal/model/User.java`

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String passwordHash;
    
    @Column(nullable = false)
    private String role = "USER";
    
    // Constructors, getters, setters...
}
```

### Database Schema
**File**: `src/main/resources/db/migration/V1_create_trades_table.sql`

```sql
CREATE TABLE trades (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    entry_price DECIMAL(19,5),
    created_at TIMESTAMP NOT NULL
);
```

**Note:** The `user_id` column is created automatically by JPA from the `@ManyToOne` relationship.

### Database Configuration
**File**: `src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:h2:file:./data/trading_journal;AUTO_SERVER=TRUE
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
```

**What happens:**
- Uses H2 database (file-based)
- `ddl-auto=update`: Automatically updates schema when entities change
- JPA creates `user_id` foreign key column automatically

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (React)                                             │
│    - User fills form (symbol, direction, entryPrice)           │
│    - Clicks "Add trade" button                                  │
│    - createTrade() function triggered                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP POST /api/trades
                             │ Authorization: Bearer <JWT_TOKEN>
                             │ Body: {symbol, direction, entryPrice}
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CORS FILTER                                                  │
│    - Checks origin (http://localhost:5173)                      │
│    - Allows request if origin matches                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. JWT AUTH FILTER (JwtAuthFilter)                              │
│    - Extracts token from Authorization header                   │
│    - Validates token                                            │
│    - Extracts email from token                                  │
│    - Loads UserDetails                                          │
│    - Sets authentication in SecurityContext                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SECURITY FILTER CHAIN                                        │
│    - Checks if endpoint requires authentication                 │
│    - Verifies authentication is present                         │
│    - Allows request to proceed                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CONTROLLER (TradeController)                                 │
│    - @PostMapping("/api/trades")                                │
│    - @Valid validates CreateTradeRequest                        │
│    - Extracts: symbol, direction, entryPrice                    │
│    - Calls service.create()                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. SERVICE (TradeServiceImpl)                                   │
│    - validateTradeInput() - business validation                 │
│    - Gets current user from SecurityContext                     │
│    - Creates new Trade entity                                   │
│    - Sets: symbol (normalized), direction (uppercase),          │
│            entryPrice, createdAt (now), user                    │
│    - Calls repository.save()                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. REPOSITORY (TradeRepository)                                 │
│    - JpaRepository.save()                                       │
│    - JPA generates INSERT SQL                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. DATABASE (H2/PostgreSQL)                                     │
│    - INSERT INTO trades (...)                                   │
│    - Generates ID (auto-increment)                              │
│    - Commits transaction                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Saved Trade entity (with ID)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. RESPONSE FLOW (back to frontend)                             │
│    Repository → Service → Controller                             │
│    - Trade entity converted to TradeResponse DTO                │
│    - Returns JSON: {id, symbol, direction, entryPrice, createdAt}│
│    - Frontend receives response                                 │
│    - loadTrades() refreshes the list                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components Summary

### 1. **Frontend** (React)
   - Form UI with input fields
   - HTTP POST request with JWT token
   - Error handling

### 2. **CORS Configuration**
   - Allows frontend origin
   - Enables cross-origin requests

### 3. **Security (JWT)**
   - Token validation
   - User authentication
   - Security context setup

### 4. **Controller**
   - REST endpoint
   - Request validation (@Valid)
   - Request/Response DTOs

### 5. **Service**
   - Business logic
   - Input validation
   - User association
   - Data normalization

### 6. **Repository**
   - Data access
   - JPA save operation
   - Database abstraction

### 7. **Entity**
   - Domain model
   - JPA mappings
   - Database relationships

### 8. **Database**
   - Physical storage
   - ID generation
   - Transaction management

---

## Error Handling

### Validation Errors (400 Bad Request)
- Missing required fields
- Invalid symbol length (> 20 chars)
- Invalid direction (not LONG/SHORT)
- Negative or zero entry price

### Authentication Errors (401 Unauthorized)
- Missing JWT token
- Invalid/expired token
- User not found

### Database Errors (500 Internal Server Error)
- Connection failures
- Constraint violations
- Transaction failures

---

## Dependencies Required

From `pom.xml`:
- `spring-boot-starter-webmvc` - REST controllers
- `spring-boot-starter-data-jpa` - JPA repositories
- `spring-boot-starter-security` - Security & JWT
- `spring-boot-starter-validation` - Bean validation
- `lombok` - Reduces boilerplate (getters/setters)

---

This completes the entire CREATE operation flow from frontend to database! 🎯
