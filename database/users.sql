
CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       email VARCHAR(100) UNIQUE NOT NULL,
                       password VARCHAR(255) NOT NULL, -- Increased length for hash storage
                       refresh_token VARCHAR(512) NULL, -- For storing refresh token (or its hash)
                       refresh_token_expires_at TIMESTAMPTZ NULL, -- Timestamp with time zone
                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add indexes for columns frequently used in WHERE clauses (email is already indexed due to UNIQUE)
-- CREATE INDEX idx_users_email ON users (email); -- Already covered by UNIQUE constraint

-- Optional: Trigger to automatically update updated_at timestamp (more robust than relying on default)
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW(); -- Use NOW() for TIMESTAMPTZ
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();