import { Platform, Vibration, NativeModules } from 'react-native';

// Get our custom haptic feedback module
const { HapticFeedback: NativeHapticFeedback } = NativeModules;

// Haptic feedback utilities
export const HapticFeedback = {
  // Light impact for successful actions (copy, toggle)
  impact: () => {
    if (Platform.OS === 'ios' && NativeHapticFeedback) {
      // Use iOS native haptic engine for a nice "bump"
      // This creates the physical tap sensation, not a vibration
      NativeHapticFeedback.impact('light');
    } else {
      // Android uses vibration
      Vibration.vibrate(10);
    }
  },

  // Error feedback for failed actions
  notificationError: () => {
    if (Platform.OS === 'ios' && NativeHapticFeedback) {
      // iOS notification error feedback - distinct "thud" feel
      NativeHapticFeedback.notification('error');
    } else {
      // Android: slightly longer vibration
      Vibration.vibrate(50);
    }
  },

  // Selection feedback for button presses
  selection: () => {
    if (Platform.OS === 'ios' && NativeHapticFeedback) {
      // iOS selection feedback - very subtle tick
      NativeHapticFeedback.selection();
    } else {
      Vibration.vibrate(5);
    }
  },
};