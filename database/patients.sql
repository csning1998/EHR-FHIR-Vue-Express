-- PostgreSQL CREATE TABLE statement for the 'patients' table

CREATE TABLE patients (
    -- Use BIGSERIAL for auto-incrementing 64-bit integer primary key
    -- Renamed PatientId to id to match common conventions and previous entity attempts
                          id BIGSERIAL PRIMARY KEY,

    -- VARCHAR maps well, use snake_case for column names (Postgres convention)
                          pid VARCHAR(10) NOT NULL,

    -- BIT maps to BOOLEAN, DEFAULT 1 maps to DEFAULT TRUE
                          active BOOLEAN NOT NULL DEFAULT TRUE,

    -- NVARCHAR maps to VARCHAR in PostgreSQL (UTF-8 handles Unicode)
                          family_name VARCHAR(50) NOT NULL,
                          given_name VARCHAR(50) NOT NULL,

    -- Increased Telecom length slightly, adjust if needed
                          telecom VARCHAR(20) NOT NULL,
                          gender VARCHAR(10) NOT NULL,

    -- DATE maps directly to DATE
                          birthday DATE NOT NULL,

    -- NVARCHAR maps to VARCHAR
                          address VARCHAR(100) NOT NULL,
                          email VARCHAR(100) NULL,
                          postal_code VARCHAR(10) NULL,
                          country VARCHAR(50) NULL,
                          preferred_language VARCHAR(50) NULL,
                          emergency_contact_name VARCHAR(50) NULL,
                          emergency_contact_relationship VARCHAR(50) NULL,
                          emergency_contact_phone VARCHAR(20) NULL

    -- Optional: Add timestamp columns if needed
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE patients ADD CONSTRAINT unique_pid UNIQUE (pid);
-- Optional: Add indexes for better query performance
CREATE INDEX idx_patients_pid ON patients (pid);
CREATE INDEX idx_patients_name ON patients (family_name, given_name);