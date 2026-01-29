ALTER TABLE trades
    ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC(18,8),
    ADD COLUMN IF NOT EXISTS take_profit_price NUMERIC(18,8);

ALTER TABLE trades
    ALTER COLUMN entry_price TYPE NUMERIC(18,8),
    ALTER COLUMN exit_price TYPE NUMERIC(18,8),
    ALTER COLUMN stop_loss_price TYPE NUMERIC(18,8),
    ALTER COLUMN take_profit_price TYPE NUMERIC(18,8);
