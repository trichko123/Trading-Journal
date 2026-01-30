ALTER TABLE trades
    ADD COLUMN commission_money NUMERIC(18, 2) NULL,
    ADD COLUMN swap_money NUMERIC(18, 2) NULL,
    ADD COLUMN net_pnl_money NUMERIC(18, 2) NULL;
