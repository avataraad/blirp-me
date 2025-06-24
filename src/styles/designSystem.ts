/**
 * Blirp Design System
 * Complete design tokens and specifications from the official Blirp design system
 * Last updated: Based on Version 3.0.0 (June 15, 2023)
 */

// Color System
export const colors = {
  // Primary Accent Color
  primary: {
    mint: '#32D74B', // Primary accent color
    mintHex: '#32D74B',
  },
  
  // Text & Icon Colors
  text: {
    primary: '#000000', // Black for primary text
    secondary: '#8E8E93', // Gray for secondary text
    heading: '#000000', // 100% opacity for headings
    body: '#000000', // 90% opacity for body text
    caption: '#8E8E93', // 70% opacity for captions
    disabled: '#C7C7CC', // 50% opacity for disabled text
  },
  
  // Secondary Colors
  secondary: {
    systemGray: '#D1D1D6',
    divider: '#C6C6C8',
    inactive: '#E5E5EA',
  },
  
  // Error Colors
  error: {
    red: '#FF3B30',
    errorRed: '#FF3B30',
  },
  
  // Background Colors
  background: {
    white: '#FFFFFF',
    lightGray: '#F9F9F7', // Light Grey Cards
    pureWhite: '#FFFFFF', // 100% opacity
  },
  
  // Usage Examples
  usage: {
    ethereum: '#2456D9', // Used for Ethereum-related elements
    positiveChange: '#32D74B', // +2.43% positive change
    negativeChange: '#FF3B30', // -1.23% negative change
    confirmed: '#32D74B', // Success states
    failed: '#FF3B30', // Transaction failed states
  },
};

// Typography
export const typography = {
  fontFamily: {
    primary: 'SF Pro Display', // Primary typeface
    text: 'SF Pro Text', // For body copy and smaller text
  },
  
  // Font Sizes & Styles
  sizes: {
    displayXL: {
      fontSize: 52, // $1,234.56 - Used for primary balances
      fontWeight: '600', // Semi-bold
      letterSpacing: -0.5,
    },
    displayM: {
      fontSize: 32, // Portfolio - Section headers
      fontWeight: '600', // Semi-bold
      letterSpacing: -0.3,
    },
    bodyText: {
      fontSize: 17, // Regular body text
      fontWeight: '400', // Regular
      lineHeight: 22,
    },
    captionText: {
      fontSize: 13, // Captions and metadata
      fontWeight: '400', // Regular
      lineHeight: 18,
    },
  },
  
  // Numeric Formatting
  numeric: {
    standard: '1234567890', // Standard display
    currency: '$1,234.56', // Currency formatting with commas
    currencyLarge: '€1,234,56', // European format
    percentage: '¥123,456', // Alternative currency
  },
  
  // Letter Spacing Rules
  letterSpacing: {
    tight: -0.5, // Display XL
    normal: 0, // Body text
    wide: 0.5, // Special cases
  },
};

// Layout & Spacing
export const spacing = {
  // 8pt Grid System
  grid: 8,
  
  // Standard spacing increments
  xs: 4,   // 4px
  sm: 8,   // 8px (1x grid)
  md: 16,  // 16px (2x grid)
  lg: 24,  // 24px (3x grid)
  xl: 32,  // 32px (4x grid)
  xxl: 48, // 48px (6x grid)
  xxxl: 64, // 64px (8x grid)
  
  // Component-specific spacing
  margins: {
    horizontal: 20, // Screen margins
    vertical: 20,
    cardPadding: 24, // Internal card padding
    sectionSpacing: 32, // Between major sections
  },
  
  // Card & Fill Dimensions
  card: {
    fullWidth: '100%',
    standardHeight: 180, // Standard card height
    cornerRadius: 16, // Card corner radius
    padding: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
  },
  
  // Pill Components
  pill: {
    height: 48,
    paddingHorizontal: 24,
    cornerRadius: 24, // Full pill
  },
};

// Button Styles
export const buttons = {
  primary: {
    backgroundColor: colors.primary.mint,
    color: colors.background.white,
    height: 56,
    borderRadius: 28,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.secondary.systemGray,
    color: colors.text.primary,
    height: 48,
    borderRadius: 24,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: spacing.md,
  },
  // Icon & Text Buttons examples
  send: {
    icon: 'arrow-up',
    label: 'Send',
  },
  receive: {
    icon: 'arrow-down',
    label: 'Receive',
  },
  swap: {
    icon: 'swap-horizontal',
    label: 'Swap',
  },
};

// Icons & Icon System
export const iconography = {
  style: 'linear', // Clean, single-weight outlines
  strokeWidth: 2, // 2px stroke consistent weight
  cornerRadius: 2, // Rounded corners for soft edges
  
  // Icon Grid & Dimensions
  sizes: {
    small: 20,  // Small icons
    medium: 24, // Default size (24x24px grid)
    large: 32,  // Large icons
  },
  
  // Icon Categories
  navigation: {
    wallet: 'wallet',
    markets: 'trending-up',
    swap: 'swap-horizontal',
    profile: 'person',
  },
  
  actions: {
    send: 'arrow-up',
    receive: 'arrow-down',
    swap: 'swap-horizontal',
    scan: 'scan',
  },
  
  status: {
    success: 'checkmark-circle',
    error: 'close-circle',
    pending: 'time',
  },
  
  crypto: {
    bitcoin: 'logo-bitcoin',
    ethereum: 'logo-ethereum',
  },
};

// Motion & Interactions
export const motion = {
  // Transition durations
  duration: {
    fast: 150, // 150ms for immediate feedback
    standard: 200, // 200-300ms optimal for most animations
    slow: 300, // For more complex transitions
  },
  
  // Easing
  easing: 'ease-out', // Natural feel for all animations
  
  // Tap feedback
  tap: {
    scale: 0.95, // Slight scale down on press
    opacity: 0.8, // Slight opacity change
    duration: 150, // Quick response
  },
  
  // Card transitions
  card: {
    slideIn: {
      duration: 250,
      from: { translateY: 20, opacity: 0 },
      to: { translateY: 0, opacity: 1 },
    },
  },
  
  // Best practices from design system:
  // - Keep it light: Subtle and purposeful
  // - Timing matters: 200-300ms optimal
  // - Respond to touch: Every interactive element should respond
};

// Background & Transparency
export const transparency = {
  // Opacity levels
  opacity: {
    uiElement: 1.0, // 100% for UI elements
    overlaySheets: 0.9, // 90% for overlay sheets
    navigationBars: 0.9, // 90% for navigation bars
    headingsIcons: 1.0, // 100% for headings & icons
    bodyText: 0.9, // 90% for body text
    captionsMetadata: 0.7, // 70% for captions
  },
  
  // Interactive states
  states: {
    default: 1.0, // 100% opacity
    pressed: 0.95, // 95% opacity when pressed
    disabled: 0.5, // 50% opacity for disabled
    outlined: 0.8, // 80% transparent background
  },
  
  // Blur effects
  blur: {
    light: 10, // Light blur (10px)
    medium: 15, // Medium blur (8px)
    heavy: 20, // Heavy blur (12px)
  },
};

// Accessibility
export const accessibility = {
  // Color contrast ratios
  contrast: {
    minimum: 4.5, // 4.5:1 minimum for text
    largeText: 3, // 3:1 for large text (24px+)
  },
  
  // Font size minimums
  fontSize: {
    minimum: 12, // Never smaller than 12px
    body: 17, // Minimum 17px for body text
  },
  
  // Touch targets
  touchTarget: {
    minimum: 44, // 44x44px minimum
    recommended: 48, // 48px recommended
  },
  
  // Interactive element spacing
  spacing: {
    minimum: 8, // 8px minimum between touch targets
  },
};

// Usage & Best Practices
export const bestPractices = {
  primaryAccent: {
    usage: ['Primary CTA buttons', 'Positive indicators', 'Active states'],
    avoid: ['Large backgrounds', 'Excessive use'],
  },
  
  hierarchy: {
    // Establish clear visual hierarchy
    heading: { fontSize: 32, fontWeight: '600' },
    subheading: { fontSize: 24, fontWeight: '500' },
    body: { fontSize: 17, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
  
  consistency: {
    // Maintain consistency in:
    spacing: 'Use 8pt grid system',
    colors: 'Stick to defined palette',
    typography: 'Use SF Pro consistently',
  },
};