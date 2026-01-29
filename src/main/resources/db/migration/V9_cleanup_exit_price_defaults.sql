ALTER TABLE trades
    ALTER COLUMN exit_price DROP DEFAULT;

UPDATE trades
SET exit_price = NULL
WHERE closed_at IS NULL
  AND exit_price = 0;
