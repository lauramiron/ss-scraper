CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS session_states;
DROP TABLE IF EXISTS streaming_accounts;
DROP TABLE IF EXISTS streaming_service CASCADE;

CREATE TABLE streaming_service (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL  -- 'netflix', 'prime', 'hulu'...
);

CREATE TABLE streaming_accounts (
    id SERIAL PRIMARY KEY,
    streaming_service_id INT UNIQUE NOT NULL REFERENCES streaming_service(id),
    email TEXT NOT NULL,
    encrypted_password BYTEA NOT NULL,
    profile_name TEXT  -- to select between multiple profiles on login
    -- last_login TIMESTAMP DEFAULT now(),
    -- updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE session_states (
    id SERIAL PRIMARY KEY,
    streaming_service_id INT UNIQUE NOT NULL REFERENCES streaming_service(id),
    json_state JSONB NOT NULL,       -- serialized Playwright storageState()
    last_login TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
