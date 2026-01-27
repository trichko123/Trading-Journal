ALTER TABLE trades
    ADD COLUMN followed_plan VARCHAR(10),
    ADD COLUMN mistakes_text VARCHAR(2000),
    ADD COLUMN improvement_text VARCHAR(2000),
    ADD COLUMN confidence INTEGER,
    ADD COLUMN review_updated_at TIMESTAMP;
