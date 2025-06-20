import React from 'react';
import { render } from '@testing-library/react-native';
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

describe('ReceiveScreen - Issue #15: WalletContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display real wallet address from context', () => {
    const mockWalletData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      walletTag: 'testuser',
      balance: '0.0000',
      balanceInUSD: 0,
      isLoading: false,
    };

    (useWallet as jest.Mock).mockReturnValue(mockWalletData);

    const { getByText } = render(
      <ReceiveScreen navigation={mockNavigation as any} />
    );

    // Should display the address when in address mode
    expect(getByText(mockWalletData.walletAddress)).toBeTruthy();
  });

  it('should display wallet tag with @ prefix from context', () => {
    const mockWalletData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      walletTag: 'testuser',
      balance: '0.0000',
      balanceInUSD: 0,
      isLoading: false,
    };

    (useWallet as jest.Mock).mockReturnValue(mockWalletData);

    const { getByText } = render(
      <ReceiveScreen navigation={mockNavigation as any} />
    );

    // Should display the tag with @ prefix
    expect(getByText('@testuser')).toBeTruthy();
  });

  it('should handle empty wallet data gracefully', () => {
    const mockWalletData = {
      walletAddress: null,
      walletTag: null,
      balance: '0.0000',
      balanceInUSD: 0,
      isLoading: false,
    };

    (useWallet as jest.Mock).mockReturnValue(mockWalletData);

    const { getByText, queryByText } = render(
      <ReceiveScreen navigation={mockNavigation as any} />
    );

    // Should show empty strings, not crash
    expect(queryByText('null')).toBeNull();
    expect(queryByText('undefined')).toBeNull();
  });

  it('should pass correct value to QR code based on display mode', () => {
    const mockWalletData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      walletTag: 'testuser',
      balance: '0.0000',
      balanceInUSD: 0,
      isLoading: false,
    };

    (useWallet as jest.Mock).mockReturnValue(mockWalletData);

    const { UNSAFE_getByType, getByText } = render(
      <ReceiveScreen navigation={mockNavigation as any} />
    );

    // Initially in tag mode
    const qrCode = UNSAFE_getByType('QRCode' as any);
    expect(qrCode.props.value).toBe('@testuser');

    // Switch to address mode
    const addressButton = getByText('Address');
    addressButton.props.onPress();

    // QR should now show address
    const updatedQrCode = UNSAFE_getByType('QRCode' as any);
    expect(updatedQrCode.props.value).toBe(mockWalletData.walletAddress);
  });

  it('should use wallet context hook', () => {
    const mockWalletData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      walletTag: 'testuser',
      balance: '0.0000',
      balanceInUSD: 0,
      isLoading: false,
    };

    (useWallet as jest.Mock).mockReturnValue(mockWalletData);

    render(<ReceiveScreen navigation={mockNavigation as any} />);

    // Verify useWallet was called
    expect(useWallet).toHaveBeenCalled();
  });
});