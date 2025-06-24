# Blirp Design System

This document outlines the complete design system for the Blirp application, based on the official design specifications.

## 🎨 Design Philosophy

Blirp's design system embraces clarity through simplicity. We believe that a powerful financial tool doesn't need to be complex. Every pixel serves a purpose, every interaction feels natural, and every screen maintains a sense of calm even when dealing with complex financial data.

### Core Principles

- **Minimalism**: Remove visual noise and unnecessary decoration
- **Clarity**: Information hierarchy guides users naturally through complex financial data
- **Simplicity**: Complex actions broken down into intuitive steps

## 🎯 Color System

### Primary Accent Color
- **Blirp Green**: `#7DD88C` - Used sparingly for important actions, success states, and positive indicators

### Text Colors
- **Primary**: `#000000` (100% opacity) - Headings and important text
- **Secondary**: `#8E8E93` (70% opacity) - Supporting information
- **Caption**: `#C7C7CC` (50% opacity) - Metadata and disabled states

### Usage Guidelines
- Use Blirp green for primary CTAs and positive financial indicators
- Reserve for success states and confirmation actions
- Avoid using for large background elements

## 📱 Typography

### Font Family
- **Primary**: SF Pro Display (for headings and large text)
- **Body**: SF Pro Text (for body copy and smaller text)

### Key Styles
```typescript
// Large balance displays
displayXL: { fontSize: 52, fontWeight: '600' } // $1,234.56

// Section headers
displayM: { fontSize: 32, fontWeight: '600' } // Portfolio

// Body text
body: { fontSize: 17, fontWeight: '400' } // Regular content

// Captions
footnote: { fontSize: 13, fontWeight: '400' } // Metadata
```

### Numeric Formatting
- Use tabular lining to prevent shifting during animations
- Standard format: `$1,234.56` with commas for readability
- Maintain consistent decimal places for currencies

## 📐 Layout & Spacing

### 8pt Grid System
All spacing follows multiples of 8px for visual harmony and consistency:
- `xs: 4px` - Minimal spacing
- `sm: 8px` - Standard grid unit
- `md: 16px` - Common spacing
- `lg: 24px` - Section spacing
- `xl: 32px` - Major spacing
- `xxl: 48px` - Large gaps

### Component Spacing
- **Card padding**: 24px all sides
- **Screen margins**: 20px horizontal
- **Section spacing**: 32px between major sections

## 🎭 Components

### Cards
- **Background**: Light Gray (`#F9F9F7`) for subtle separation
- **Corner radius**: 16px for modern, friendly feel
- **Padding**: 24px internal spacing
- **Shadow**: Subtle elevation for depth

### Buttons
```typescript
// Primary CTA
primary: {
  backgroundColor: '#7DD88C',
  height: 56px,
  borderRadius: 28px, // Full pill shape
  color: '#FFFFFF'
}

// Secondary actions
secondary: {
  backgroundColor: '#D1D1D6',
  height: 48px,
  borderRadius: 24px
}
```

### Action Components
- **Send**: Arrow up icon + "Send" label
- **Receive**: Arrow down icon + "Receive" label  
- **Swap**: Swap horizontal icon + "Swap" label

## 🎬 Motion & Interactions

### Timing
- **Fast feedback**: 150ms for immediate responses
- **Standard transitions**: 200-300ms for optimal perception
- **Easing**: `ease-out` for natural feel

### Touch Feedback
- Scale down to 95% on press
- 150ms duration for quick response
- Every interactive element should provide immediate feedback

### Best Practices
- Keep animations subtle and purposeful
- Never distract from content
- Respond to every touch interaction

## ♿ Accessibility

### Color Contrast
- Minimum 4.5:1 ratio for text
- 3:1 for large text (24px+)
- Color is never the only indicator

### Touch Targets
- Minimum 44x44px for all interactive elements
- 8px minimum spacing between targets
- Consider one-handed usage patterns

### Typography
- Minimum 12px font size
- 17px minimum for body text
- Clear hierarchy for screen readers

## 📊 Usage Examples

### Financial Data Display
```typescript
// Portfolio value
$12,345.67 // DisplayXL, primary balance

// Asset names
Bitcoin // Body text, asset identification
BTC // Caption, symbol

// Change indicators
+2.43% // Blirp green for positive
-1.23% // Error red for negative
```

### State Indicators
- **Success**: Blirp green (#7DD88C) with checkmark
- **Error**: Error red (#FF3B30) with X or warning
- **Pending**: System gray with loading indicator

## 🔧 Implementation

### Using the Design System
```typescript
import { theme } from '../styles/theme';
import { colors, typography, spacing } from '../styles/designSystem';

// Use theme for consistent styling
<Text style={theme.typography.displayXL}>$1,234.56</Text>

// Or reference design system directly
<View style={{ 
  backgroundColor: colors.primary.green,
  padding: spacing.card.padding.top 
}} />
```

### Best Practices
1. Always reference theme/design system instead of hardcoding values
2. Use semantic color names (primary, success, error) rather than color values
3. Follow spacing grid consistently
4. Test with real financial data for proper formatting
5. Ensure accessibility standards are met

## 📚 Resources

- **Figma Library**: Complete UI kit with all components
- **Icon Library**: SVG icons optimized for the design system
- **Color Palette**: Complete color system with variables
- **Typography**: SF Pro font family files

## 🔄 Updates & Versioning

**Current Version**: 3.0.0 (June 15, 2023)

### Recent Changes
- Added new card component with improved asset visualization
- Refined typography system for better readability on small screens
- Removed deprecated gradient backgrounds from action buttons

For the complete changelog and version history, see the design system documentation.

---

*This design system ensures consistency across all Blirp interfaces while maintaining the flexibility to evolve with user needs and technological advances.*