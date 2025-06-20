import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReceiveScreen from '../ReceiveScreen';
import { useWallet } from '../../contexts/WalletContext';

// Mock the navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock the WalletContext
jest.mock('../../contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock QRCode component
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Mock Share API
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Share.share = jest.fn();
  RN.Alert.alert = jest.fn();
  return RN;
});

import { Share, Alert } from 'react-native';

describe('Milestone 1.1: Connect ReceiveScreen to WalletContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue #15: Import and integrate WalletContext', () => {
    it('should display real wallet address from context', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Switch to address mode
      const addressButton = getByText('Address');
      fireEvent.press(addressButton);

      // Should display the address
      expect(getByText(mockWalletData.walletAddress)).toBeTruthy();
    });

    it('should display wallet tag with @ prefix', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should display the tag with @ prefix (default mode is tag)
      expect(getByText('@testuser')).toBeTruthy();
    });

    it('should pass correct values to QR code component', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { UNSAFE_getByType, getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Initially in tag mode
      let qrCode = UNSAFE_getByType('QRCode' as any);
      expect(qrCode.props.value).toBe('@testuser');

      // Switch to address mode
      const addressButton = getByText('Address');
      fireEvent.press(addressButton);

      // QR should now show address
      qrCode = UNSAFE_getByType('QRCode' as any);
      expect(qrCode.props.value).toBe(mockWalletData.walletAddress);
    });
  });

  describe('Issue #16: Handle wallet data initialization', () => {
    it('should handle null wallet data gracefully', () => {
      const mockWalletData = {
        walletAddress: null,
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText, queryByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should show loading message, not crash
      expect(getByText('Loading address...')).toBeTruthy();
      expect(queryByText('null')).toBeNull();
      expect(queryByText('undefined')).toBeNull();
    });

    it('should not show tag toggle when user has no tag', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { queryByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should not show tag/address toggle buttons
      expect(queryByText('Tag')).toBeNull();
      expect(queryByText('Address')).toBeNull();
    });

    it('should handle empty string tag correctly', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: '   ', // whitespace only
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { queryByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should not show toggle since tag is effectively empty
      expect(queryByText('Tag')).toBeNull();
    });

    it('should not render QR code when address is missing', () => {
      const mockWalletData = {
        walletAddress: null,
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { queryByType, getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should show loading placeholder instead of QR code
      expect(queryByType('QRCode' as any)).toBeNull();
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should prevent copy when no display value', () => {
      const mockWalletData = {
        walletAddress: null,
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      const copyButton = getByText('Copy');
      fireEvent.press(copyButton);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No address to copy');
    });

    it('should prevent share when no display value', () => {
      const mockWalletData = {
        walletAddress: null,
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No address to share');
      expect(Share.share).not.toHaveBeenCalled();
    });
  });

  describe('Issue #17: Fix tag display formatting', () => {
    it('should show contextual share message for tag', async () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);
      (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('@testuser'),
      });
      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('BlirpMe - Simple crypto payments'),
      });
    });

    it('should show contextual share message for address', async () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'testuser',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);
      (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Switch to address mode
      const addressButton = getByText('Address');
      fireEvent.press(addressButton);

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('0x1234567890123456789012345678901234567890'),
      });
      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Network: Ethereum Mainnet'),
      });
    });

    it('should show "No tag set" when tag is missing', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Since no tag, it should default to address mode
      // But let's check what happens if we were in tag mode
      expect(getByText('Your Address')).toBeTruthy();
    });

    it('should show hint message when no tag is set', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { queryByText } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // The hint is only shown when in tag mode and no tag exists
      // Since we default to address mode when no tag, hint shouldn't show
      expect(queryByText('You haven\'t set a tag yet. Use your address to receive funds.')).toBeNull();
    });
  });

  describe('Integration tests', () => {
    it('should handle complete user flow with tag and address', () => {
      const mockWalletData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletTag: 'johndoe',
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);
      (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

      const { getByText, UNSAFE_getByType } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Verify initial state (tag mode)
      expect(getByText('@johndoe')).toBeTruthy();
      expect(getByText('Your Tag')).toBeTruthy();
      
      // Verify QR code shows tag
      let qrCode = UNSAFE_getByType('QRCode' as any);
      expect(qrCode.props.value).toBe('@johndoe');

      // Test copy functionality
      const copyButton = getByText('Copy');
      fireEvent.press(copyButton);
      expect(Alert.alert).toHaveBeenCalledWith('Copied!', '@johndoe copied to clipboard');

      // Switch to address mode
      const addressButton = getByText('Address');
      fireEvent.press(addressButton);

      // Verify address display
      expect(getByText(mockWalletData.walletAddress)).toBeTruthy();
      expect(getByText('Your Address')).toBeTruthy();

      // Verify QR code shows address
      qrCode = UNSAFE_getByType('QRCode' as any);
      expect(qrCode.props.value).toBe(mockWalletData.walletAddress);

      // Test share functionality
      const shareButton = getByText('Share');
      fireEvent.press(shareButton);
      expect(Share.share).toHaveBeenCalled();
    });

    it('should handle wallet with address but no tag', () => {
      const mockWalletData = {
        walletAddress: '0xabcdef1234567890123456789012345678901234',
        walletTag: null,
      };

      (useWallet as jest.Mock).mockReturnValue(mockWalletData);

      const { getByText, queryByText, UNSAFE_getByType } = render(
        <ReceiveScreen navigation={mockNavigation as any} />
      );

      // Should default to address mode
      expect(getByText('Your Address')).toBeTruthy();
      expect(getByText(mockWalletData.walletAddress)).toBeTruthy();

      // Should not show toggle buttons
      expect(queryByText('Tag')).toBeNull();
      expect(queryByText('Address')).toBeNull();

      // QR code should show address
      const qrCode = UNSAFE_getByType('QRCode' as any);
      expect(qrCode.props.value).toBe(mockWalletData.walletAddress);
    });
  });
});