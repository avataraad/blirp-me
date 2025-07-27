-- BlirpMe User Profiles Table
-- This script creates the user_profiles table for storing user information

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    ethereum_address VARCHAR(42) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    privacy_settings JSONB DEFAULT '{
        "show_phone_to_friends": false,
        "allow_payment_requests": true,
        "show_profile_in_search": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tag ON user_profiles(tag);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_address ON user_profiles(ethereum_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE user_profiles 
ADD CONSTRAINT check_tag_format CHECK (
    tag ~ '^[a-z0-9_]+$' AND 
    length(tag) >= 2 AND 
    length(tag) <= 50
);

ALTER TABLE user_profiles 
ADD CONSTRAINT check_ethereum_address_format CHECK (
    ethereum_address ~ '^0x[a-fA-F0-9]{40}$'
);

ALTER TABLE user_profiles 
ADD CONSTRAINT check_phone_number_format CHECK (
    phone_number ~ '^\+[1-9]\d{1,14}$'
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Users can read all profiles that have show_profile_in_search = true
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (
        (privacy_settings->>'show_profile_in_search')::boolean = true
    );

-- Policy: Users can read their own profile (by tag)
-- Note: This assumes we'll have authentication context
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (
        tag = current_setting('request.jwt.claims', true)::json->>'tag'
    );

-- Policy: Anyone can insert (for new user registration)
-- In production, you might want to restrict this based on authentication
CREATE POLICY "Anyone can create profile" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (
        tag = current_setting('request.jwt.claims', true)::json->>'tag'
    ) WITH CHECK (
        tag = current_setting('request.jwt.claims', true)::json->>'tag'
    );

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (
        tag = current_setting('request.jwt.claims', true)::json->>'tag'
    );

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Stores user profile information for BlirpMe app users';
COMMENT ON COLUMN user_profiles.tag IS 'Unique username (without @) - lowercase alphanumeric and underscore only';
COMMENT ON COLUMN user_profiles.phone_number IS 'Phone number in E.164 format (e.g., +1234567890)';
COMMENT ON COLUMN user_profiles.ethereum_address IS 'Ethereum wallet address in checksum format';
COMMENT ON COLUMN user_profiles.privacy_settings IS 'JSON object containing user privacy preferences';
COMMENT ON COLUMN user_profiles.is_verified IS 'Whether the user account has been verified (phone, identity, etc.)';

-- Create some example test data (remove in production)
-- INSERT INTO user_profiles (tag, phone_number, ethereum_address, display_name) VALUES
-- ('alice', '+12345551001', '0x742d35Cc6634C0532925a3b8D2c6d5c5B1c1b8c2', 'Alice Cooper'),
-- ('bob', '+12345551002', '0x8ba1f109551bD432803012645Hac136c98F73Ae2', 'Bob Smith'),
-- ('charlie', '+12345551003', '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', 'Charlie Brown');

-- Show table structure
\d user_profiles;