import { Platform, Vibration, NativeModules } from 'react-native';

// Check for native modules
const { HapticFeedback: NativeHapticFeedback } = NativeModules;

// Try to access React Native's internal haptic feedback (if available)
let ReactNativeHaptic: any = null;
try {
  // This is an undocumented API but it exists in React Native
  ReactNativeHaptic = require('react-native/Libraries/Components/Touchable/TouchableWithoutFeedback').Touchable?.TOUCH_TARGET_DEBUG;
  // Actually, let's try the Haptic Feedback API
  const RCTHaptic = NativeModules.HapticFeedbackManager || NativeModules.RNHapticFeedback;
  if (RCTHaptic) {
    ReactNativeHaptic = RCTHaptic;
  }
} catch (e) {
  // Fallback to vibration
}

// Haptic feedback utilities
export const HapticFeedback = {
  // Light impact for successful actions (copy, toggle)
  impact: () => {
    if (Platform.OS === 'ios') {
      // Use native haptic module for proper "bump" feedback
      if (NativeHapticFeedback) {
        NativeHapticFeedback.impact('light');
        return;
      }
      
      // Fallback - the module isn't loaded yet
      console.warn('HapticFeedback: Native module not found. Did you add the files to Xcode?');
      return;
    } else {
      // Android uses vibration
      Vibration.vibrate(10);
    }
  },

  // Error feedback for failed actions
  notificationError: () => {
    if (Platform.OS === 'ios') {
      if (NativeHapticFeedback) {
        NativeHapticFeedback.notification('error');
        return;
      }
      
      // For now, disable vibration on iOS
      return;
    } else {
      // Android: slightly longer vibration
      Vibration.vibrate(50);
    }
  },

  // Selection feedback for button presses
  selection: () => {
    if (Platform.OS === 'ios') {
      if (NativeHapticFeedback) {
        NativeHapticFeedback.selection();
        return;
      }
      
      // For now, disable vibration on iOS
      return;
    } else {
      Vibration.vibrate(5);
    }
  },
};