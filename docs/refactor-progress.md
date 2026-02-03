# Refactor Progress Tracker

## Phases
- [x] Phase 1: Extract pure utilities into modules
- [x] Phase 2: Extract DetailRow + TradeDetailsPanelLeft/Right components
- [x] Phase 3: Extract modals and major UI sections
- [x] Phase 4: Extract hooks/state management (filters, pagination, drawers)
- [x] Phase 5: Extract API client + stats engine modules

## Done (Phase 1)
Moved pure utilities from `frontend/trading-journal-ui/src/App.jsx` into:

- `frontend/trading-journal-ui/src/shared/lib/price.js`
  - getPriceDecimals
  - getPriceStep
  - formatPriceValue
- `frontend/trading-journal-ui/src/shared/lib/format.js`
  - formatMoneyValue
  - formatMoneyNullable
  - formatPercentValue
  - formatRValue
  - formatWinPct
- `frontend/trading-journal-ui/src/shared/lib/datetime.js`
  - parseCreatedAt
  - formatDate
  - toIsoString
  - toDateTimeLocalValue
  - toIsoFromLocal
  - getDateRangeFromPreset
  - matchesDatePreset
  - formatDuration
- `frontend/trading-journal-ui/src/shared/lib/authToken.js`
  - normalizeEmail
  - base64UrlDecode
  - tryExtractEmailFromIdToken
- `frontend/trading-journal-ui/src/features/risk/utils/riskFormat.js`
  - formatCalcNumber
  - formatCalcInteger
  - formatCalcPrice
- `frontend/trading-journal-ui/src/features/stats/utils/outcomes.js`
  - computeStrategyOutcomeR
  - isNetPnlPresent
  - getRealizedRIfPresent
  - getOutcomeRForMode
  - formatOutcome
  - getOutcomeClass

## Remaining (not moved yet)
- Cleanup (unused imports, duplicate entries, formatting)
- Lint/build verification
- Deployment readiness checklist
- Tests (optional)

## Rules
- feature -> shared is allowed
- shared -> feature is not allowed

## Phase 3 started
- frontend/trading-journal-ui/src/app/layout/HeaderBar.jsx
- frontend/trading-journal-ui/src/features/auth/components/AuthCard.jsx
- frontend/trading-journal-ui/src/features/trades/components/AddTradeForm.jsx
- frontend/trading-journal-ui/src/features/trades/components/FiltersPanel.jsx
- frontend/trading-journal-ui/src/features/trades/components/TradesTable.jsx
- frontend/trading-journal-ui/src/shared/components/Pagination.jsx
- frontend/trading-journal-ui/src/features/trades/components/ReviewModal.jsx
- frontend/trading-journal-ui/src/features/attachments/components/AttachmentLightbox.jsx
- frontend/trading-journal-ui/src/features/attachments/components/AttachmentUploadModal.jsx
- frontend/trading-journal-ui/src/features/account/components/AccountSettingsModal.jsx
- frontend/trading-journal-ui/src/features/cashflows/components/DeleteCashflowModal.jsx
- frontend/trading-journal-ui/src/features/risk/components/RiskCalculatorModal.jsx
- frontend/trading-journal-ui/src/features/cashflows/components/CashflowsModal.jsx
- frontend/trading-journal-ui/src/features/cashflows/components/CashflowEditModal.jsx

## Phase 3.2: AuthCard extracted
- frontend/trading-journal-ui/src/features/auth/components/AuthCard.jsx

## Phase 3.3: AddTradeForm extracted
- frontend/trading-journal-ui/src/features/trades/components/AddTradeForm.jsx

## Phase 3.4: FiltersPanel extracted
- frontend/trading-journal-ui/src/features/trades/components/FiltersPanel.jsx

## Phase 3.5: TradesTable extracted
- frontend/trading-journal-ui/src/features/trades/components/TradesTable.jsx

## Phase 3.6: Pagination extracted
- frontend/trading-journal-ui/src/shared/components/Pagination.jsx

## Phase 3.7: DeleteTradeModal extracted
- frontend/trading-journal-ui/src/features/trades/components/DeleteTradeModal.jsx

## Phase 3.8: ReviewModal extracted
- frontend/trading-journal-ui/src/features/trades/components/ReviewModal.jsx

## Phase 3.9: AttachmentLightbox extracted
- frontend/trading-journal-ui/src/features/attachments/components/AttachmentLightbox.jsx

## Phase 3.10: AttachmentUploadModal extracted
- frontend/trading-journal-ui/src/features/attachments/components/AttachmentUploadModal.jsx

## Phase 3.11: AccountSettingsModal extracted
- frontend/trading-journal-ui/src/features/account/components/AccountSettingsModal.jsx

## Phase 3.12a: CashflowsModal extracted
- frontend/trading-journal-ui/src/features/cashflows/components/CashflowsModal.jsx

## Phase 3.12b: CashflowEditModal extracted
- frontend/trading-journal-ui/src/features/cashflows/components/CashflowEditModal.jsx

## Phase 3.12c: DeleteCashflowModal extracted
- frontend/trading-journal-ui/src/features/cashflows/components/DeleteCashflowModal.jsx

## Phase 3.13: RiskCalculatorModal extracted
- frontend/trading-journal-ui/src/features/risk/components/RiskCalculatorModal.jsx

## Phase 4.1: usePagination hook extracted
- frontend/trading-journal-ui/src/shared/hooks/usePagination.js

## Phase 4.2a: useTradesFilters hook extracted (state/handlers)
- frontend/trading-journal-ui/src/features/trades/hooks/useTradesFilters.js

## Phase 4.2b: filteredTrades memo moved into useTradesFilters

## Phase 4.3: useUIState hook extracted (modals/drawer state)
- frontend/trading-journal-ui/src/app/hooks/useUIState.js

## Phase 4.4: useAttachments hook extracted (load + grouping)
- frontend/trading-journal-ui/src/features/attachments/hooks/useAttachments.js

## Phase 4.5: useRiskCalculatorState hook extracted
- frontend/trading-journal-ui/src/features/risk/hooks/useRiskCalculatorState.js

## Phase 5.1: shared http client + tradesApi.getTrades migrated
- frontend/trading-journal-ui/src/shared/api/http.js
- frontend/trading-journal-ui/src/features/trades/api/tradesApi.js

## Phase 5.2: tradesApi migrated POST/PUT/DELETE/PATCH
- frontend/trading-journal-ui/src/features/trades/api/tradesApi.js
- frontend/trading-journal-ui/src/shared/api/http.js

## Phase 5.3: accountApi migrated GET/PUT
- frontend/trading-journal-ui/src/features/account/api/accountApi.js

## Phase 5.4: cashflowsApi migrated GET/POST/PUT/DELETE
- frontend/trading-journal-ui/src/features/cashflows/api/cashflowsApi.js

## Phase 5.5: attachmentsApi migrated GET/POST/PATCH/DELETE
- frontend/trading-journal-ui/src/features/attachments/api/attachmentsApi.js
- frontend/trading-journal-ui/src/shared/api/http.js

## Phase 5.6a: stats ledger engine extracted
- frontend/trading-journal-ui/src/features/stats/engine/ledger.js

## Phase 5.6b: summary stats engine extracted
- frontend/trading-journal-ui/src/features/stats/engine/summaryStats.js

## Phase 5.6c: money metrics engine extracted
- frontend/trading-journal-ui/src/features/stats/engine/moneyMetrics.js

## Phase 5.6d: useStatsEngine hook extracted (composes ledger + stats + money)
- frontend/trading-journal-ui/src/features/stats/hooks/useStatsEngine.js

## Current module map
- frontend/trading-journal-ui/src/shared/api/http.js
- frontend/trading-journal-ui/src/features/trades/api/tradesApi.js
- frontend/trading-journal-ui/src/features/account/api/accountApi.js
- frontend/trading-journal-ui/src/features/cashflows/api/cashflowsApi.js
- frontend/trading-journal-ui/src/features/attachments/api/attachmentsApi.js
- frontend/trading-journal-ui/src/features/stats/engine/ledger.js
- frontend/trading-journal-ui/src/features/stats/engine/summaryStats.js
- frontend/trading-journal-ui/src/features/stats/engine/moneyMetrics.js
- frontend/trading-journal-ui/src/features/stats/hooks/useStatsEngine.js
