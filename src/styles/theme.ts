export const theme = {
    colors: {
      primary: '#7DD88C', // Updated Blirp Green from design system
      secondary: '#D1D1D6', // System Gray
      success: '#7DD88C', // Same as primary green
      danger: '#FF3B30', // Error Red from design system
      warning: '#FF9500',
      background: '#FFFFFF', // Pure White
      surface: '#F9F9F7', // Light Gray Cards
      text: {
        primary: '#000000', // Black (100% opacity)
        secondary: '#8E8E93', // Gray (70% opacity)
        tertiary: '#C7C7CC', // Disabled (50% opacity)
        inverse: '#FFFFFF',
      },
      border: '#C6C6C8', // Divider color
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    typography: {
      // Display styles for large numbers (from design system)
      displayXL: {
        fontSize: 52, // $1,234.56 - Primary balances
        fontWeight: '600' as const,
        letterSpacing: -0.5,
        fontFamily: 'SF Pro Display',
      },
      displayM: {
        fontSize: 32, // Portfolio - Section headers
        fontWeight: '600' as const,
        letterSpacing: -0.3,
        fontFamily: 'SF Pro Display',
      },
      largeTitle: {
        fontSize: 34,
        fontWeight: '700' as const,
        lineHeight: 41,
      },
      title1: {
        fontSize: 28,
        fontWeight: '600' as const,
        lineHeight: 34,
      },
      title2: {
        fontSize: 22,
        fontWeight: '600' as const,
        lineHeight: 28,
      },
      title3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 25,
      },
      headline: {
        fontSize: 17,
        fontWeight: '600' as const,
        lineHeight: 22,
      },
      body: {
        fontSize: 17, // Body Text from design system
        fontWeight: '400' as const,
        lineHeight: 22,
        fontFamily: 'SF Pro Text',
      },
      callout: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 21,
      },
      subhead: {
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 20,
      },
      footnote: {
        fontSize: 13, // Caption Text from design system
        fontWeight: '400' as const,
        lineHeight: 18,
        fontFamily: 'SF Pro Text',
      },
      caption1: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
      },
      caption2: {
        fontSize: 11,
        fontWeight: '400' as const,
        lineHeight: 13,
      },
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 999,
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      },
    },
  };
