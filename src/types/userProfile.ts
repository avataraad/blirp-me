/**
 * User Profile Types
 * Defines the structure for user profiles in the BlirpMe app
 */

export interface UserProfile {
  id: string;
  tag: string; // Unique @username (without the @)
  phone_number: string;
  ethereum_address: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  show_phone_to_friends: boolean;
  allow_payment_requests: boolean;
  show_profile_in_search: boolean;
}

export interface CreateUserProfileData {
  tag: string;
  phone_number: string;
  ethereum_address: string;
  display_name?: string;
  privacy_settings?: Partial<PrivacySettings>;
}

export interface UpdateUserProfileData {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  privacy_settings?: Partial<PrivacySettings>;
}

// Phone number validation types
export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber?: string;
  e164Number?: string;
  countryCode?: string;
  error?: string;
}

export interface PhoneNumberInput {
  countryCode: string;
  number: string;
}