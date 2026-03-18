-- ============================================================
-- MATRIMONY PLATFORM - COMPLETE DATABASE SCHEMA
-- PostgreSQL 16+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password                VARCHAR(255),
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    mobile                  VARCHAR(15) UNIQUE,
    date_of_birth           DATE,
    gender                  VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    role                    VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    auth_provider           VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'google')),
    google_id               VARCHAR(255) UNIQUE,
    is_email_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    is_mobile_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    is_profile_complete     BOOLEAN NOT NULL DEFAULT FALSE,
    profile_completion_step INTEGER NOT NULL DEFAULT 0,
    account_status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended', 'blocked')),
    admin_approved          BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at           TIMESTAMPTZ,
    otp_secret              VARCHAR(10),
    otp_expires_at          TIMESTAMPTZ,
    otp_attempts            INTEGER NOT NULL DEFAULT 0,
    refresh_token           TEXT,
    subscription_plan       VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'premium', 'gold')),
    subscription_expires_at TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

-- ============================================================
-- PERSONAL DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_details (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    marital_status      VARCHAR(30) CHECK (marital_status IN ('never_married', 'divorced', 'widowed', 'awaiting_divorce')),
    height              DECIMAL(5, 2),
    weight              DECIMAL(5, 2),
    mother_tongue       VARCHAR(100),
    citizenship         VARCHAR(100) DEFAULT 'Indian',
    about_me            TEXT,
    profile_picture_url TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FAMILY DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS family_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    father_name             VARCHAR(150),
    father_occupation       VARCHAR(150),
    mother_name             VARCHAR(150),
    mother_occupation       VARCHAR(150),
    family_contact_number   VARCHAR(15),
    number_of_brothers      INTEGER NOT NULL DEFAULT 0,
    number_of_sisters       INTEGER NOT NULL DEFAULT 0,
    permanent_address       TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    country                 VARCHAR(100) DEFAULT 'India',
    pincode                 VARCHAR(10),
    family_type             VARCHAR(20) CHECK (family_type IN ('nuclear', 'joint', 'extended')),
    family_status           VARCHAR(30) CHECK (family_status IN ('middle_class', 'upper_middle_class', 'rich', 'affluent')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_details_city ON family_details(city);
CREATE INDEX IF NOT EXISTS idx_family_details_state ON family_details(state);

-- ============================================================
-- EMPLOYMENT DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS employment_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    highest_education       VARCHAR(150),
    education_details       TEXT,
    employment_type         VARCHAR(30) CHECK (employment_type IN (
                                'state_government', 'central_government', 'psu',
                                'banking', 'private', 'self_employed', 'others', 'unemployed'
                            )),
    department_company_name VARCHAR(200),
    job_role                VARCHAR(150),
    monthly_salary          DECIMAL(12, 2),
    annual_income           DECIMAL(14, 2),
    working_since           DATE,
    office_address          TEXT,
    office_city             VARCHAR(100),
    office_state            VARCHAR(100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_type ON employment_details(employment_type);
CREATE INDEX IF NOT EXISTS idx_employment_salary ON employment_details(monthly_salary);

-- ============================================================
-- COMMUNITY & HOROSCOPE DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS community_details (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    religion                    VARCHAR(30) CHECK (religion IN ('hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'others')),
    caste                       VARCHAR(10) CHECK (caste IN ('oc', 'bc', 'mbc', 'sc', 'st', 'others')),
    sub_caste                   VARCHAR(150),
    gothram                     VARCHAR(100),
    physically_challenged       BOOLEAN NOT NULL DEFAULT FALSE,
    physical_challenge_details  TEXT,
    raasi                       VARCHAR(50),
    star                        VARCHAR(50),
    dhosham                     VARCHAR(30) CHECK (dhosham IN ('yes', 'no', 'partial', 'chevvai_dosham', 'rahu_dosham', 'others')),
    birth_time                  TIME,
    birth_place                 VARCHAR(150),
    preferred_community         BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_religion          VARCHAR(100),
    preferred_caste             VARCHAR(200),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_religion ON community_details(religion);
CREATE INDEX IF NOT EXISTS idx_community_caste ON community_details(caste);
CREATE INDEX IF NOT EXISTS idx_community_raasi ON community_details(raasi);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type       VARCHAR(30) NOT NULL CHECK (document_type IN (
                            'profile_picture', 'aadhaar', 'pan', 'driving_license',
                            'employee_id', 'payslip', 'passport', 'other'
                        )),
    original_name       VARCHAR(255) NOT NULL,
    s3_key              TEXT NOT NULL,
    s3_bucket           VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100),
    file_size           BIGINT,
    is_encrypted        BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);

-- ============================================================
-- SEARCH PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS search_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    preferred_gender    VARCHAR(10),
    min_age             INTEGER,
    max_age             INTEGER,
    preferred_religion  VARCHAR(30),
    preferred_caste     VARCHAR(10),
    preferred_city      VARCHAR(100),
    preferred_state     VARCHAR(100),
    min_salary          DECIMAL(12, 2),
    max_salary          DECIMAL(12, 2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS interests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_receiver ON interests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_interests_sender ON interests(sender_id);

-- ============================================================
-- PROFILE VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_views (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(viewer_id, viewed_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);

-- ============================================================
-- BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL CHECK (reason IN (
                    'fake_profile', 'inappropriate_content', 'harassment',
                    'spam', 'scam', 'underage', 'other'
                )),
    description TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message    TEXT,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;


-- ============================================================
-- FCM TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL,
    platform   VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'premium', 'gold')),
    amount          DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(5) NOT NULL DEFAULT 'INR',
    payment_id      VARCHAR(255),
    payment_gateway VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_personal_details_updated_at BEFORE UPDATE ON personal_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_family_details_updated_at BEFORE UPDATE ON family_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_employment_details_updated_at BEFORE UPDATE ON employment_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_community_details_updated_at BEFORE UPDATE ON community_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- DEFAULT ADMIN USER
-- ============================================================
INSERT INTO users (
    id, email, first_name, last_name, role,
    is_email_verified, account_status, admin_approved, auth_provider
) VALUES (
    gen_random_uuid(),
    'admin@matrimony.com',
    'Platform',
    'Admin',
    'admin',
    TRUE, 'active', TRUE, 'local'
) ON CONFLICT (email) DO NOTHING;
