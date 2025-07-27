import { PhoneValidationResult, PhoneNumberInput } from '../types/userProfile';

/**
 * Phone number validation utilities
 * Provides comprehensive phone number validation and formatting
 */

// Common country codes and their patterns
const COUNTRY_PATTERNS: Record<string, { pattern: RegExp; format: string }> = {
  'US': {
    pattern: /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    format: '+1 (###) ###-####'
  },
  'CA': {
    pattern: /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    format: '+1 (###) ###-####'
  },
  'GB': {
    pattern: /^(\+44)?[1-9]\d{8,9}$/,
    format: '+44 #### ######'
  },
  'AU': {
    pattern: /^(\+61)?[2-478]\d{8}$/,
    format: '+61 # #### ####'
  }
};

/**
 * Validates a phone number string
 * @param phoneNumber - The phone number to validate
 * @param countryCode - Optional country code (defaults to US)
 * @returns PhoneValidationResult with validation status and formatted number
 */
export function validatePhoneNumber(
  phoneNumber: string,
  countryCode: string = 'US'
): PhoneValidationResult {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Clean the phone number (remove spaces, dashes, parentheses)
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if country code is supported
  const countryPattern = COUNTRY_PATTERNS[countryCode.toUpperCase()];
  if (!countryPattern) {
    return {
      isValid: false,
      error: `Country code ${countryCode} is not supported`
    };
  }

  // Validate against country pattern
  if (!countryPattern.pattern.test(cleanNumber)) {
    return {
      isValid: false,
      error: `Invalid phone number format for ${countryCode}`
    };
  }

  // Format the number
  const formattedNumber = formatPhoneNumber(cleanNumber, countryCode);

  // Get E.164 format for database storage
  const e164Number = getE164Format(cleanNumber, countryCode);

  return {
    isValid: true,
    formattedNumber,
    e164Number,
    countryCode: countryCode.toUpperCase()
  };
}

/**
 * Formats a phone number according to country standards
 * @param phoneNumber - Clean phone number (digits only)
 * @param countryCode - Country code
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  const countryPattern = COUNTRY_PATTERNS[countryCode.toUpperCase()];
  if (!countryPattern) {
    return phoneNumber;
  }

  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      // Format: +1 (###) ###-####
      const usMatch = phoneNumber.match(/^(\+?1)?(\d{3})(\d{3})(\d{4})$/);
      if (usMatch) {
        return `+1 (${usMatch[2]}) ${usMatch[3]}-${usMatch[4]}`;
      }
      break;
    
    case 'GB':
      // Format: +44 #### ######
      const gbMatch = phoneNumber.match(/^(\+?44)?(\d{4})(\d{6})$/);
      if (gbMatch) {
        return `+44 ${gbMatch[2]} ${gbMatch[3]}`;
      }
      break;
    
    case 'AU':
      // Format: +61 # #### ####
      const auMatch = phoneNumber.match(/^(\+?61)?(\d{1})(\d{4})(\d{4})$/);
      if (auMatch) {
        return `+61 ${auMatch[2]} ${auMatch[3]} ${auMatch[4]}`;
      }
      break;
  }

  return phoneNumber;
}

/**
 * Converts a phone number to E.164 format for database storage
 * @param phoneNumber - Clean phone number (digits only)
 * @param countryCode - Country code
 * @returns E.164 formatted phone number (e.g., +1234567890)
 */
export function getE164Format(phoneNumber: string, countryCode: string): string {
  // Remove any non-digits
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      // Add +1 if not present
      if (digitsOnly.startsWith('1')) {
        return `+${digitsOnly}`;
      }
      return `+1${digitsOnly}`;
    
    case 'GB':
      // Add +44 if not present
      if (digitsOnly.startsWith('44')) {
        return `+${digitsOnly}`;
      }
      return `+44${digitsOnly}`;
    
    case 'AU':
      // Add +61 if not present
      if (digitsOnly.startsWith('61')) {
        return `+${digitsOnly}`;
      }
      return `+61${digitsOnly}`;
    
    default:
      // For unsupported countries, assume the number already includes country code
      return `+${digitsOnly}`;
  }
}

/**
 * Validates phone number input from form components
 * @param input - PhoneNumberInput object with country code and number
 * @returns PhoneValidationResult
 */
export function validatePhoneInput(input: PhoneNumberInput): PhoneValidationResult {
  return validatePhoneNumber(input.number, input.countryCode);
}

/**
 * Extracts country code from a formatted phone number
 * @param phoneNumber - Formatted phone number
 * @returns Country code or null if not found
 */
export function extractCountryCode(phoneNumber: string): string | null {
  if (phoneNumber.startsWith('+1')) return 'US';
  if (phoneNumber.startsWith('+44')) return 'GB';
  if (phoneNumber.startsWith('+61')) return 'AU';
  
  return null;
}

/**
 * Checks if a phone number is likely a mobile number
 * @param phoneNumber - Phone number to check
 * @param countryCode - Country code
 * @returns boolean indicating if it's likely a mobile number
 */
export function isMobileNumber(phoneNumber: string, countryCode: string): boolean {
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)\.+]/g, '');
  
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      // In North America, mobile numbers are not easily distinguishable from landlines
      return true; // Assume all are mobile for simplicity
    
    case 'GB':
      // UK mobile numbers typically start with 07
      return cleanNumber.startsWith('447') || cleanNumber.startsWith('07');
    
    case 'AU':
      // AU mobile numbers typically start with 4
      return cleanNumber.startsWith('614') || cleanNumber.startsWith('4');
    
    default:
      return true; // Default to true for unsupported countries
  }
}