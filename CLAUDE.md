# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development:**
```bash
npm start                # Start Metro bundler
npm run ios             # Run on iOS simulator
npm run android         # Run on Android emulator
```

**Code Quality:**
```bash
npm run lint           # Run ESLint
npm test               # Run Jest tests
```

## Architecture Overview

BlirpMe is a React Native cryptocurrency wallet app built around a tag-based payment system (@username) with Ethereum support.

### Navigation Structure
The app uses React Navigation with a two-tier architecture:
- **Stack Navigator** (AppNavigator): Handles authentication flow (Welcome → CreateWallet/SignIn → MainTabs)
- **Bottom Tab Navigator** (MainTabs): Main app with Home, Pay, and Receive screens

### Key Architectural Patterns

**Theme System (`src/styles/theme.ts`):**
- Centralized design system with iOS-inspired aesthetics
- Comprehensive color palette, typography scale (11 levels), spacing system, and shadows
- All components should reference this theme object for consistency

**Screen Structure Pattern:**
Each screen follows this pattern:
- TypeScript props interface with navigation typing
- React.FC component with proper navigation prop types
- StyleSheet.create() using theme values
- Consistent SafeAreaView usage

**Type System:**
- `src/types/navigation.ts` contains all navigation type definitions
- Use `StackNavigationProp` and `BottomTabNavigationProp` for proper typing
- All screens have proper TypeScript interfaces

### Service Layer Architecture
The app is designed around these service patterns (currently unimplemented):

**Blockchain Services (`src/services/`):**
- Wallet management with ethers.js
- Transaction handling and gas estimation
- Network switching and configuration

**Security Services:**
- react-native-keychain integration for secure storage
- Biometric authentication (Face ID/Touch ID)
- Passkey-based authentication system

### State Management
Currently uses local React state. The architecture supports adding:
- Global wallet state management
- Transaction history persistence
- User preferences and settings

## Key Implementation Areas

**Wallet Integration:**
- The app uses ethers.js 5.7.2 for Ethereum functionality
- Secure storage via react-native-keychain for private keys
- Tag system maps @usernames to Ethereum addresses

**Payment Flow:**
- Pay screen supports both @tags and 0x addresses
- Real-time balance checking and gas estimation needed
- Transaction confirmation with biometric approval

**Security Model:**
- Device-based security (no seed phrases)
- Biometric authentication for transactions
- Secure enclave storage for sensitive data

## Development Guidelines

**Styling:**
- Always use the theme system from `src/styles/theme.ts`
- Follow the established spacing, typography, and color patterns
- Use StyleSheet.create() with theme references

**Navigation:**
- Import navigation types from `src/types/navigation.ts`
- Follow the established prop typing patterns for screens
- Use proper navigation methods (navigate, goBack, etc.)

**Component Structure:**
- Place reusable components in `src/components/`
- Follow the existing TypeScript patterns
- Use proper prop interfaces and React.FC typing

**Services:**
- Implement blockchain services in `src/services/`
- Use async/await patterns for blockchain calls
- Implement proper error handling for network requests

## Technology Stack Notes

**Core Dependencies:**
- React Native 0.75.4 with React 18.3.1
- TypeScript 5.0.4 for type safety
- React Navigation 7.x for routing

**Blockchain:**
- ethers.js 5.7.2 for Ethereum integration
- Currently supports Ethereum mainnet architecture

**UI Libraries:**
- react-native-vector-icons (Ionicons) for consistent iconography
- react-native-qrcode-svg for payment QR codes
- react-native-reanimated for smooth animations

**Security:**
- react-native-keychain for secure credential storage
- Planned biometric authentication integration