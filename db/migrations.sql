CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop tables in reverse dependency order
-- DROP TABLE IF EXISTS session_states;
-- DROP TABLE IF EXISTS streaming_accounts;
-- DROP TABLE IF EXISTS streaming_service CASCADE;

CREATE TABLE IF NOT EXISTS streaming_service (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL  -- 'netflix', 'prime', 'hulu'...
);

-- Insert default streaming services
INSERT INTO streaming_service (name) VALUES
  ('netflix'),
  ('hbo'),
  ('hulu'),
  ('disney'),
  ('apple'),
  ('prime'),
  ('paramount')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS streaming_accounts (
    id SERIAL PRIMARY KEY,
    streaming_service_id INT UNIQUE NOT NULL REFERENCES streaming_service(id),
    email TEXT NOT NULL,
    encrypted_password BYTEA NOT NULL,
    profile_name TEXT  -- to select between multiple profiles on login
    -- last_login TIMESTAMP DEFAULT now(),
    -- updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_states (
    id SERIAL PRIMARY KEY,
    streaming_service_id INT UNIQUE NOT NULL REFERENCES streaming_service(id),
    json_state JSONB NOT NULL,       -- serialized Playwright storageState()
    last_login TIMESTAMP DEFAULT now(),
    expires TIMESTAMP DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'streaming_service_data_type') THEN
        CREATE TYPE streaming_service_data_type AS ENUM ('resume');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS streaming_service_data (
    id SERIAL PRIMARY KEY,
    streaming_service_id INT NOT NULL REFERENCES streaming_service(id),
    data_type streaming_service_data_type NOT NULL,
    json_data JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS streaming_service_data_datatype_json_index ON streaming_service_data (streaming_service_id, data_type)