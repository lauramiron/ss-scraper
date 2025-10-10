CREATE TABLE IF NOT EXISTS streaming_accounts (
    service TEXT PRIMARY KEY,        -- 'netflix', 'hulu', etc.
    email TEXT NOT NULL,
    encrypted_password BYTEA NOT NULL,
    last_login TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_states (
    service TEXT PRIMARY KEY,        -- 'netflix', 'hulu', etc.
    json_state JSONB NOT NULL,       -- serialized Playwright storageState()
    updated_at TIMESTAMP DEFAULT now()
);
