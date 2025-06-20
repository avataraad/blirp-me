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
  
  // Set initial display mode based on available data
  const [displayMode, setDisplayMode] = useState<'address' | 'tag'>(
    hasTag ? 'tag' : 'address'
  );

  // Use real wallet data from context with defensive checks
  const address = walletAddress || '';
  const tag = walletTag?.trim() ? `@${walletTag.trim()}` : '';

  const displayValue = displayMode === 'tag' ? tag : address;

  const handleCopy = async () => {
    if (!displayValue) {
      HapticFeedback.notificationError();
      Alert.alert('Error', 'No address to copy');
      return;
    }
    
    try {
      await Clipboard.setString(displayValue);
      HapticFeedback.impact();
      Alert.alert('Copied!', `${displayValue} copied to clipboard`);
    } catch (error) {
      HapticFeedback.notificationError();
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const shareAsText = async () => {
    const shareMessage = displayMode === 'tag' && hasTag
      ? `💎 Send crypto to my BlirpMe wallet!\n\n${displayValue}\n\nBlirpMe makes crypto payments simple with @username tags.\n\nDownload: https://blirpme.com`
      : `💰 Send ETH to my wallet:\n\n${displayValue}\n\n🔗 Network: Ethereum Mainnet\n⚠️  Only send ETH or ERC-20 tokens to this address\n📱 Powered by BlirpMe`;
    
    await Share.share({ message: shareMessage });
  };

  const shareAsPaymentLink = async () => {
    // Create ethereum: URI for payment requests
    const paymentUri = `ethereum:${address}`;
    const message = displayMode === 'tag' && hasTag
      ? `💎 Pay me using BlirpMe: ${displayValue}\n\nPayment Link: ${paymentUri}\n\nDownload BlirpMe: https://blirpme.com`
      : `💰 ETH Payment Request\n\nAddress: ${displayValue}\nPayment Link: ${paymentUri}\n\n📱 Powered by BlirpMe`;
    
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <View style={styles.qrContainer}>
          {hasAddress ? (
            <QRCode
              value={displayMode === 'tag' && hasTag ? tag : address}
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

        {/* Toggle Buttons - Only show if user has both tag and address */}
        {hasTag && hasAddress && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                displayMode === 'tag' && styles.toggleButtonActive,
              ]}
              onPress={() => setDisplayMode('tag')}
            >
              <Text style={[
                styles.toggleButtonText,
                displayMode === 'tag' && styles.toggleButtonTextActive,
              ]}>
                Tag
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                displayMode === 'address' && styles.toggleButtonActive,
              ]}
              onPress={() => setDisplayMode('address')}
            >
              <Text style={[
                styles.toggleButtonText,
                displayMode === 'address' && styles.toggleButtonTextActive,
              ]}>
                Address
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Address/Tag Display */}
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>
          {displayMode === 'tag' ? 'Your Tag' : 'Your Address'}
        </Text>
        <View style={styles.addressContainer}>
          <Text 
            style={[
              styles.addressText,
              !displayValue && styles.addressTextPlaceholder
            ]} 
            numberOfLines={displayMode === 'address' ? 2 : 1}
          >
            {displayValue || (displayMode === 'tag' ? 'No tag set' : 'Loading address...')}
          </Text>
        </View>
        {displayMode === 'tag' && !hasTag && hasAddress && (
          <Text style={styles.noTagHint}>
            You haven't set a tag yet. Use your address to receive funds.
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
          <Icon name="copy-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Copy</Text>
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

      {/* Network Badge */}
      <View style={styles.networkBadge}>
        <Text style={styles.networkBadgeText}>Ethereum Mainnet</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
  },
  toggleButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: theme.colors.text.inverse,
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
});

export default ReceiveScreen;
