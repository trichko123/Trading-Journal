# App.jsx Refactor Map

Last updated: 2026-02-01
Source: frontend/trading-journal-ui/src/App.jsx

## Refactor status
- Phase 1: DONE
  - frontend/trading-journal-ui/src/shared/lib/price.js
  - frontend/trading-journal-ui/src/shared/lib/format.js
  - frontend/trading-journal-ui/src/shared/lib/datetime.js
  - frontend/trading-journal-ui/src/shared/lib/authToken.js
  - frontend/trading-journal-ui/src/features/risk/utils/riskFormat.js
  - frontend/trading-journal-ui/src/features/stats/utils/outcomes.js
- Phase 2+: TODO

## High-level outline (in order)
1) Imports + constants
   - React hooks, GoogleLogin, helpers (exportToCsv, instruments, riskCalculator), CSS
   - API base setup + shared constants (attachments, timeframe, currencies)
2) Shared helper functions (file-scope)
   - Price formatting helpers
   - Money/percent formatting helpers
3) Shared UI components (file-scope)
   - DetailRow
   - TradeDetailsPanelLeft
   - TradeDetailsPanelRight
4) App component
   - State declarations (auth, account settings, cashflows, trades, edit state, attachments, review, risk calc, filters/paging, UI flags)
   - Derived constants (refresh cooldown, session options)
   - Pure helpers / formatting / parsing
   - Auth handlers (Google, login, register)
   - Date/time helpers
   - Trade calculators (RR, session, duration)
   - Effects (cooldown timer, attachment preview, ESC handlers, load-on-token, pagination bounds, lightbox reset, localStorage for risk calc)
   - API loaders + CRUD (trades, account settings, cashflows, attachments, review)
   - Memoized derived data (symbol options, ledgers, filtered trades, stats, money metrics, pagination)
   - Render
     - Header card + account dropdown
     - Auth card (login/register)
     - Add Trade form + RR helper
     - Trades card (summary, filters, table, pagination)
     - Trade details drawers
     - Modals: risk calc, account settings, cashflows, cashflow edit/delete, attachment upload, lightbox, delete trade, delete attachment, review

## Reusable UI blocks (candidate components)
- Header / Account strip
  - Header card with title, signed-in chips, refresh button, account dropdown
- Auth card
  - Auth toggle + form + GoogleLogin block + error banner
- Add Trade form
  - Symbol/Direction/Entry/SL/TP inputs + helper RR text
- Trades summary header
  - Stats mode toggle, balances pills, cashflow pill
- Filters panel
  - Symbol/direction/status/session selectors + date presets + custom date inputs
- Summary stats grid
  - Cards: total trades, avg R, win rate, confidence, realized coverage, money metrics
- Trades table
  - Table header/row renderer + action buttons
- Pagination
  - Prev/Next + numeric pager
- Trade details drawers
  - Left drawer: details/edit/close/notes
  - Right drawer: attachments by section
- Modals / overlays
  - Account settings modal
  - Cashflows list + create form modal
  - Cashflow edit modal
  - Cashflow delete confirm modal
  - Risk calculator modal
  - Attachment upload modal
  - Lightbox image viewer
  - Trade delete confirm modal
  - Attachment delete confirm modal
  - Review modal
- Utility UI
  - DetailRow, badges, pills, toggle button groups

## Pure functions / utils to extract
Notes: Some are pure; some become pure if dependencies are passed in (e.g., statsMode, ledgers).

File-scope helpers
- getPriceDecimals(symbol)
- getPriceStep(symbol)
- formatPriceValue(value, symbol)
- formatMoneyValue(value, currencyCode, fallbackSymbol)
- formatMoneyNullable(value, currencyCode, { forceNegative })
- formatPercentValue(value, decimals)

App helpers (likely utils)
- computeStrategyOutcomeR(trade)
- isNetPnlPresent(trade)
- getRealizedRIfPresent(trade, realizedLedgerByTrade)
- getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade })
- formatOutcome(trade, deps)
- formatCashflowTypeLabel(value)
- formatCashflowAmount(cashflow, currency)
- getOutcomeClass(trade, deps)
- normalizeEmail(value)
- base64UrlDecode(value)
- tryExtractEmailFromIdToken(idToken)
- parseCreatedAt(value)
- formatDate(value)
- toIsoString(value)
- toDateTimeLocalValue(value)
- toIsoFromLocal(value)
- formatSymbol(symbol)
- computeDerived(symbol, direction, entry, stopLoss, takeProfit)
- getSessionMatches(value)
- getSessionLabel(value)
- formatDuration(startValue, endValue)
- getDateRangeFromPreset(preset)
- matchesDatePreset(dateValue, preset, customFrom, customTo)
- formatRValue(value)
- formatWinPct(value)
- formatCalcNumber(value, decimals)
- formatCalcInteger(value)
- formatCalcPrice(value, symbolValue)

## API calls / endpoints and dependent UI
Auth
- POST /auth/google
  - Used by: GoogleLogin onSuccess (auth card)
- POST /auth/login
  - Used by: Login form submit (auth card)
- POST /auth/register
  - Used by: Register form submit (auth card)

Trades
- GET /trades
  - Used by: Initial load on token, Refresh button, after mutations
  - UI: Trades table, stats, drawers
- POST /trades
  - Used by: Add Trade form submit
- PUT /trades/{id}
  - Used by: Edit trade, close trade inline/details
  - UI: Trade details drawer, table row actions
- DELETE /trades/{id}
  - Used by: Delete trade confirm modal
- PATCH /trades/{id}/review
  - Used by: Review modal submit (final note)

Account settings
- GET /account-settings
  - Used by: Header balance chips, risk calc defaults, account settings modal
- PUT /account-settings
  - Used by: Account settings modal save

Cashflows
- GET /cashflows
  - Used by: Cashflows modal, ledger calculations, summary pills
- POST /cashflows
  - Used by: Cashflow create form
- PUT /cashflows/{id}
  - Used by: Cashflow edit modal
- DELETE /cashflows/{id}
  - Used by: Cashflow delete confirm modal

Attachments
- GET /trades/{tradeId}/attachments
  - Used by: Trade details drawers (right panel)
- POST /trades/{tradeId}/attachments
  - Used by: Attachment upload modal
- PATCH /attachments/{attachmentId}
  - Used by: Attachment timeframe selector
- DELETE /attachments/{attachmentId}
  - Used by: Attachment delete confirm modal

## Dependency graph (data flow)
Auth/session
- token -> loadTrades + loadAccountSettings + loadCashflows
- token -> Authorization headers for all protected endpoints

Core data
- trades -> symbolOptions, filteredTrades, trade table rows
- cashflows -> ledgerEvents, cashflowNet, cashflow pills
- accountSettings -> strategyLedger + realizedLedger

Ledgers + stats
- ledgerEvents depends on trades + cashflows + computeStrategyOutcomeR
- strategyLedger depends on accountSettings + ledgerEvents
- realizedLedger depends on accountSettings + ledgerEvents + isNetPnlPresent
- activeLedger depends on statsMode + strategyLedger + realizedLedger
- filteredTrades depends on trades + filters + datePreset + fromDate + toDate + getSessionLabel
- summaryStats depends on filteredTrades + getOutcomeRForMode
- realizedCoverage depends on filteredTrades + isNetPnlPresent
- moneyMetrics depends on filteredTrades + activeLedger + getOutcomeRForMode
- cashflowNet depends on cashflows + datePreset/fromDate/toDate
- periodBalanceRange depends on activeLedger + filteredTrades + datePreset/fromDate/toDate

Selection + details
- selectedTradeForDetails -> selectedTradeMoney (activeLedger) + selectedStrategyMoney + selectedRealizedMoney
- selectedTradeForDetails + isDetailsOpen -> loadAttachments
- attachmentsBySection -> TradeDetailsPanelRight

UI/pagination
- filteredTrades -> sortedTrades -> pagedTrades -> table rows
- currentPage + totalPages -> paginationItems
- tradeCsvColumns depends on formatters + getRealizedRIfPresent

Notes for refactor sequencing (no code changes yet)
- Extract pure formatting/date helpers first (utils/format, utils/dates)
- Split TradeDetailsPanelLeft/Right into separate component files
- Pull each modal into a component with explicit props
- Move API calls into a small api client (auth, trades, cashflows, attachments)
- Centralize ledger/calculation logic into a dedicated stats module
