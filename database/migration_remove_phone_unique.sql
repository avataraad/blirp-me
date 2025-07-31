-- Migration: Remove UNIQUE constraint from phone_number column
-- This allows multiple users to have the same phone number (different wallets)
-- while keeping tags unique

-- Drop the existing unique constraint on phone_number
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_phone_number_key;

-- Keep the indexes for performance but remove uniqueness
DROP INDEX IF EXISTS idx_user_profiles_phone;
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);

-- Verify that tag and ethereum_address remain unique
-- (These constraints should already exist, but let's ensure they're there)
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_tag_key,
  ADD CONSTRAINT user_profiles_tag_key UNIQUE (tag);

ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_ethereum_address_key,
  ADD CONSTRAINT user_profiles_ethereum_address_key UNIQUE (ethereum_address);

-- Add a comment explaining the change
COMMENT ON COLUMN user_profiles.phone_number IS 'Phone number in E.164 format (e.g., +1234567890) - NOT UNIQUE, users can have multiple wallets';