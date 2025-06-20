import { Platform, Vibration } from 'react-native';

// Haptic feedback utilities
export const HapticFeedback = {
  // Light impact for successful actions (copy, toggle)
  impact: () => {
    if (Platform.OS === 'ios') {
      // iOS uses a very short vibration for impact
      Vibration.vibrate(1);
    } else {
      // Android uses a slightly longer vibration
      Vibration.vibrate(10);
    }
  },

  // Error feedback for failed actions
  notificationError: () => {
    if (Platform.OS === 'ios') {
      // iOS pattern: short-pause-short
      Vibration.vibrate([0, 10, 40, 10]);
    } else {
      // Android: slightly longer vibration
      Vibration.vibrate(50);
    }
  },

  // Selection feedback for button presses
  selection: () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(1);
    } else {
      Vibration.vibrate(5);
    }
  },
};