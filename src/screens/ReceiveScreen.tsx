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
  
  // State for showing address in testing mode
  const [showAddress, setShowAddress] = useState(false);

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
  const tag = walletTag?.trim() || '';
  const tagWithAt = tag ? `@${tag}` : '';

  // Always display tag (or message if no tag)
  const displayValue = tag;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleCopy = async () => {
    if (!hasTag) {
      HapticFeedback.notificationError();
      showToast('No username to copy', 'error');
      return;
    }
    
    // Button press animation
    setCopyButtonPressed(true);
    setTimeout(() => setCopyButtonPressed(false), 150);
    
    try {
      await Clipboard.setString(tagWithAt);
      HapticFeedback.impact();
      showToast(`✓ Copied ${tagWithAt}`);
    } catch (error) {
      HapticFeedback.notificationError();
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const shareAsText = async () => {
    const shareMessage = `💎 Send crypto to my BlirpMe wallet!\n\n${tagWithAt}\n\nBlirpMe makes crypto payments simple with @username tags.\n\nDownload: https://blirpme.com`;
    
    await Share.share({ message: shareMessage });
  };

  const shareAsPaymentLink = async () => {
    // Create BlirpMe payment link
    const paymentLink = `https://blirpme.com/pay/${tag}`;
    const message = `💎 Pay me using BlirpMe: ${tagWithAt}\n\nPayment Link: ${paymentLink}\n\nDownload BlirpMe: https://blirpme.com`;
    
    await Share.share({ message });
  };

  const shareUsernameOnly = async () => {
    // Share just the username without extra formatting
    await Share.share({ message: tagWithAt });
  };

  const handleShare = async () => {
    if (!hasTag) {
      HapticFeedback.notificationError();
      Alert.alert('No Username', 'Please set a username in your profile to share');
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
            '📋 Share Username Only',
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
                await shareUsernameOnly();
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
            text: '📋 Username Only',
            onPress: async () => {
              try {
                await shareUsernameOnly();
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
          {hasTag ? (
            <QRCode
              value={`blirpme:${tagWithAt}`}
              size={200}
              backgroundColor={theme.colors.background}
              color={theme.colors.text.primary}
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Icon 
                name="qr-code-outline" 
                size={80} 
                color={theme.colors.text.tertiary} 
              />
              <Text style={styles.qrPlaceholderText}>Set a username to generate QR code</Text>
            </View>
          )}
        </View>
      </View>

      {/* Username Display */}
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>
          Username
        </Text>
        <TouchableOpacity 
          style={styles.addressContainer}
          onPress={hasTag ? handleCopy : undefined}
          disabled={!hasTag}
          activeOpacity={0.7}
        >
          <View style={styles.usernameRow}>
            {hasTag && (
              <Text style={styles.atSymbol}>@</Text>
            )}
            <Text 
              style={[
                styles.addressText,
                !displayValue && styles.addressTextPlaceholder
              ]} 
              numberOfLines={1}
            >
              {displayValue || 'No username set'}
            </Text>
          </View>
        </TouchableOpacity>
        {!hasTag && (
          <Text style={styles.noTagHint}>
            Set a username in your profile to receive payments.
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            copyButtonPressed && styles.actionButtonPressed,
            !hasTag && styles.actionButtonDisabled
          ]} 
          onPress={handleCopy}
          disabled={!hasTag}
        >
          <Icon 
            name={copyButtonPressed ? "checkmark-outline" : "copy-outline"} 
            size={24} 
            color={!hasTag ? theme.colors.text.tertiary : (copyButtonPressed ? theme.colors.surface : theme.colors.primary)} 
          />
          <Text style={[
            styles.actionButtonText,
            copyButtonPressed && styles.actionButtonTextPressed,
            !hasTag && styles.actionButtonTextDisabled
          ]}>
            {copyButtonPressed ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, !hasTag && styles.actionButtonDisabled]} 
          onPress={handleShare}
          disabled={!hasTag}
        >
          <Icon name="share-outline" size={24} color={!hasTag ? theme.colors.text.tertiary : theme.colors.primary} />
          <Text style={[styles.actionButtonText, !hasTag && styles.actionButtonTextDisabled]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Network Info */}
      <View style={styles.infoCard}>
        <Icon name="information-circle-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.infoText}>
          Only send ETH and Ethereum-based tokens to this address. Sending other cryptocurrencies may result in permanent loss.
        </Text>
      </View>

      {/* Testing Button - Show Address */}
      {hasAddress && (
        <TouchableOpacity 
          style={styles.testingButton} 
          onPress={() => {
            setShowAddress(!showAddress);
            if (!showAddress) {
              // Auto-hide after 10 seconds
              setTimeout(() => setShowAddress(false), 10000);
            }
          }}
        >
          <Icon 
            name={showAddress ? "eye-off-outline" : "eye-outline"} 
            size={16} 
            color={theme.colors.text.secondary} 
          />
          <Text style={styles.testingButtonText}>
            {showAddress ? 'Hide Address' : 'Show Address (Testing)'}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Address Display for Testing */}
      {showAddress && hasAddress && (
        <View style={styles.testingAddressContainer}>
          <Text style={styles.testingAddressLabel}>Wallet Address:</Text>
          <Text style={styles.testingAddressText}>{address}</Text>
          <TouchableOpacity 
            onPress={async () => {
              await Clipboard.setString(address);
              HapticFeedback.impact();
              showToast('Address copied');
            }}
            style={styles.testingCopyButton}
          >
            <Icon name="copy-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.testingCopyText}>Copy</Text>
          </TouchableOpacity>
        </View>
      )}
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atSymbol: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    gap: theme.spacing.md,
  },
  qrPlaceholderText: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 160,
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
  actionButtonDisabled: {
    backgroundColor: theme.colors.surface,
    opacity: 0.6,
  },
  actionButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  testingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  testingButtonText: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  testingAddressContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  testingAddressLabel: {
    ...theme.typography.caption2,
    color: theme.colors.text.secondary,
  },
  testingAddressText: {
    ...theme.typography.caption1,
    color: theme.colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  testingCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  testingCopyText: {
    ...theme.typography.caption2,
    color: theme.colors.primary,
  },
});

export default ReceiveScreen;
