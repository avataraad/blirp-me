import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
  Alert,
  Platform,
  Vibration,
  ActionSheetIOS,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../contexts/WalletContext';
import Clipboard from '@react-native-clipboard/clipboard';
import { HapticFeedback } from '../utils/haptics';
import Toast from '../components/Toast';

type ReceiveScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Receive'
>;

type Props = {
  navigation: ReceiveScreenNavigationProp;
};

const ReceiveScreen: React.FC<Props> = () => {
  const { walletAddress, walletTag } = useWallet();
  
  // Handle edge cases for wallet data
  const hasTag = Boolean(walletTag && walletTag.trim());
  const hasAddress = Boolean(walletAddress);
  
  // Force tag-only display
  const displayMode = 'tag';

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Copy button animation state
  const [copyButtonPressed, setCopyButtonPressed] = useState(false);

  // Use real wallet data from context with defensive checks
  const address = walletAddress || '';
  const tag = walletTag?.trim() ? `@${walletTag.trim()}` : '';

  const displayValue = tag;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleCopy = async () => {
    if (!displayValue) {
      HapticFeedback.notificationError();
      showToast('No address to copy', 'error');
      return;
    }
    
    // Button press animation
    setCopyButtonPressed(true);
    setTimeout(() => setCopyButtonPressed(false), 150);
    
    try {
      await Clipboard.setString(displayValue);
      HapticFeedback.impact();
      const shortValue = displayValue.length > 20 
        ? `${displayValue.slice(0, 10)}...${displayValue.slice(-8)}`
        : displayValue;
      showToast(`✓ Copied ${shortValue}`);
    } catch (error) {
      HapticFeedback.notificationError();
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const shareAsText = async () => {
    const shareMessage = hasTag
      ? `💎 Send crypto to my BlirpMe wallet!\n\n${displayValue}\n\nBlirpMe makes crypto payments simple with @username tags.\n\nDownload: https://blirpme.com`
      : `💰 Send crypto to my BlirpMe wallet!\n\nI'm setting up my @username tag. For now, send ETH to:\n\n${address}\n\n📱 Powered by BlirpMe`;
    
    await Share.share({ message: shareMessage });
  };

  const shareAsPaymentLink = async () => {
    // Create blirpme: URI for tag payments or ethereum: URI for address payments
    const paymentUri = hasTag ? `blirpme:${displayValue}` : `ethereum:${address}`;
    const message = hasTag
      ? `💎 Pay me using BlirpMe: ${displayValue}\n\nPayment Link: ${paymentUri}\n\nDownload BlirpMe: https://blirpme.com`
      : `💰 BlirpMe Payment Request\n\nTag: ${displayValue} (setting up)\nPayment Link: ${paymentUri}\n\n📱 Download BlirpMe: https://blirpme.com`;
    
    await Share.share({ message });
  };

  const shareAddressOnly = async () => {
    // Share just the address/tag without extra formatting
    await Share.share({ message: displayValue });
  };

  const handleShare = async () => {
    if (!displayValue) {
      HapticFeedback.notificationError();
      Alert.alert('Error', 'No address to share');
      return;
    }

    if (Platform.OS === 'ios') {
      // iOS Action Sheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Cancel',
            '📄 Share as Text',
            '🔗 Share Payment Link',
            '📋 Share Address Only',
          ],
          cancelButtonIndex: 0,
          title: 'Share Options',
          message: 'Choose how you want to share your wallet information',
        },
        async (buttonIndex) => {
          try {
            switch (buttonIndex) {
              case 1:
                await shareAsText();
                break;
              case 2:
                await shareAsPaymentLink();
                break;
              case 3:
                await shareAddressOnly();
                break;
              default:
                return;
            }
            HapticFeedback.impact();
          } catch (error) {
            HapticFeedback.notificationError();
            Alert.alert('Error', 'Failed to share');
          }
        }
      );
    } else {
      // Android - show Alert with options
      Alert.alert(
        'Share Options',
        'Choose how you want to share your wallet information',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📄 Share as Text',
            onPress: async () => {
              try {
                await shareAsText();
                HapticFeedback.impact();
              } catch (error) {
                HapticFeedback.notificationError();
                Alert.alert('Error', 'Failed to share');
              }
            },
          },
          {
            text: '🔗 Share Payment Link',
            onPress: async () => {
              try {
                await shareAsPaymentLink();
                HapticFeedback.impact();
              } catch (error) {
                HapticFeedback.notificationError();
                Alert.alert('Error', 'Failed to share');
              }
            },
          },
          {
            text: '📋 Address Only',
            onPress: async () => {
              try {
                await shareAddressOnly();
                HapticFeedback.impact();
              } catch (error) {
                HapticFeedback.notificationError();
                Alert.alert('Error', 'Failed to share');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.contentContainer}
      >
      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <View style={styles.qrContainer}>
          {hasAddress ? (
            <QRCode
              value={hasTag ? `blirpme:${tag}` : address}
              size={200}
              backgroundColor={theme.colors.background}
              color={theme.colors.text.primary}
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>Loading...</Text>
            </View>
          )}
        </View>

        {/* Show Address Testing Button - For development/testing only */}
        {hasAddress && (
          <TouchableOpacity 
            style={styles.showAddressButton}
            onPress={() => {
              Alert.alert(
                'Wallet Address',
                address,
                [
                  { text: 'Copy', onPress: () => Clipboard.setString(address) },
                  { text: 'Close', style: 'cancel' }
                ]
              );
            }}
          >
            <Text style={styles.showAddressButtonText}>Show Address</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Address/Tag Display */}
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>
          Your Tag
        </Text>
        <View style={styles.addressContainer}>
          <Text 
            style={[
              styles.addressText,
              !displayValue && styles.addressTextPlaceholder
            ]} 
            numberOfLines={1}
          >
            {displayValue || 'No tag set'}
          </Text>
        </View>
        {!hasTag && hasAddress && (
          <Text style={styles.noTagHint}>
            You haven't set a tag yet. Share this screen to receive payments with your @username.
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            copyButtonPressed && styles.actionButtonPressed
          ]} 
          onPress={handleCopy}
        >
          <Icon 
            name={copyButtonPressed ? "checkmark-outline" : "copy-outline"} 
            size={24} 
            color={copyButtonPressed ? theme.colors.surface : theme.colors.primary} 
          />
          <Text style={[
            styles.actionButtonText,
            copyButtonPressed && styles.actionButtonTextPressed
          ]}>
            {copyButtonPressed ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Icon name="share-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Network Info */}
      <View style={styles.infoCard}>
        <Icon name="information-circle-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.infoText}>
          Only send ETH and Ethereum-based tokens to this address. Sending other cryptocurrencies may result in permanent loss.
        </Text>
      </View>

      {/* BlirpMe Badge */}
      <View style={styles.networkBadge}>
        <Text style={styles.networkBadgeText}>BlirpMe Wallet</Text>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  qrContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  showAddressButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.text.tertiary,
  },
  showAddressButtonText: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  addressSection: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  addressLabel: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  addressContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  addressText: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionSection: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionButtonText: {
    ...theme.typography.headline,
    color: theme.colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  networkBadge: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  networkBadgeText: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  addressTextPlaceholder: {
    fontStyle: 'italic',
    color: theme.colors.text.tertiary,
  },
  noTagHint: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  actionButtonPressed: {
    backgroundColor: theme.colors.primary,
    transform: [{ scale: 0.95 }],
  },
  actionButtonTextPressed: {
    color: theme.colors.surface,
  },
});

export default ReceiveScreen;
