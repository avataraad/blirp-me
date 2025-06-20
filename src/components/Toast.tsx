import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  type?: 'success' | 'error';
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  onHide,
  type = 'success',
  duration = 2000,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.toast, type === 'error' && styles.errorToast]}>
        <Icon
          name={type === 'success' ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={type === 'success' ? theme.colors.primary : '#FF6B6B'}
        />
        <Text style={[styles.message, type === 'error' && styles.errorMessage]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  errorToast: {
    borderColor: '#FF6B6B20',
  },
  message: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  errorMessage: {
    color: '#FF6B6B',
  },
});

export default Toast;