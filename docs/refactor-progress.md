# Refactor Progress Tracker

## Phases
- [x] Phase 1: Extract pure utilities into modules
- [x] Phase 2: Extract DetailRow + TradeDetailsPanelLeft/Right components
- [ ] Phase 3: Extract modals and major UI sections
- [ ] Phase 4: Extract hooks/state management (filters, pagination, drawers)
- [ ] Phase 5: Extract API client + stats engine modules

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
- Components: other UI blocks (modals, forms, tables)
- Hooks/state: trade filters, pagination, drawer state, modal state, attachment flows
- API layer: auth, trades, cashflows, attachments, review endpoints
- Stats engine: ledgers, money metrics, summary stats

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
