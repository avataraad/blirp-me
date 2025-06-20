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
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../contexts/WalletContext';

type ReceiveScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Receive'
>;

type Props = {
  navigation: ReceiveScreenNavigationProp;
};

const ReceiveScreen: React.FC<Props> = () => {
  const [displayMode, setDisplayMode] = useState<'address' | 'tag'>('tag');
  const { walletAddress, walletTag } = useWallet();

  // Use real wallet data from context
  const address = walletAddress || '';
  const tag = walletTag ? `@${walletTag}` : '';

  const displayValue = displayMode === 'tag' ? tag : address;

  const handleCopy = () => {
    // In a real app, we'd use Clipboard API
    Alert.alert('Copied!', `${displayValue} copied to clipboard`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Send crypto to my Blirp wallet: ${displayValue}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share');
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
          <QRCode
            value={displayMode === 'tag' ? tag : address}
            size={200}
            backgroundColor={theme.colors.background}
            color={theme.colors.text.primary}
          />
        </View>

        {/* Toggle Buttons */}
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
      </View>

      {/* Address/Tag Display */}
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>
          {displayMode === 'tag' ? 'Your Tag' : 'Your Address'}
        </Text>
        <View style={styles.addressContainer}>
          <Text style={styles.addressText} numberOfLines={displayMode === 'address' ? 2 : 1}>
            {displayValue}
          </Text>
        </View>
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
});

export default ReceiveScreen;
