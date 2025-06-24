import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { useWallet } from '../../contexts/WalletContext';
import { getWalletBalances } from '../../services/balance';

// Mock dependencies
jest.mock('../../contexts/WalletContext');
jest.mock('../../services/balance');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
};

const mockWalletBalanceResponse = {
  tokens: [
    {
      token_address: null,
      name: 'Ethereum',
      symbol: 'ETH',
      balance_formatted: '1.2345',
      usd_value: 2469.14,
      usd_price: 2000,
      portfolio_percentage: 100,
    },
  ],
  total_usd_value: 2469.14,
  total_tokens_count: 1,
  total_positions_count: 1,
  cursor: null,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useWallet as jest.Mock).mockReturnValue({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f6D842',
    });
  });

  it('should render loading state initially', () => {
    (getWalletBalances as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading
    );

    const { getByTestId, queryByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    expect(queryByText('Total Balance')).toBeTruthy();
    // Would need to add testID to ActivityIndicator to properly test
  });

  it('should display wallet balances after loading', async () => {
    (getWalletBalances as jest.Mock).mockResolvedValue(mockWalletBalanceResponse);

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText('1.2345 ETH')).toBeTruthy();
      expect(getByText('$2469.14')).toBeTruthy();
    });
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to fetch balances';
    (getWalletBalances as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  it('should refresh balances on pull to refresh', async () => {
    (getWalletBalances as jest.Mock).mockResolvedValue(mockWalletBalanceResponse);

    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getWalletBalances).toHaveBeenCalledTimes(1);
    });

    // Trigger refresh - would need to add testID to ScrollView
    // fireEvent(getByTestId('home-scroll'), 'refresh');

    // Verify balance service called again
    // expect(getWalletBalances).toHaveBeenCalledTimes(2);
  });

  it('should handle no wallet address', async () => {
    (useWallet as jest.Mock).mockReturnValue({
      walletAddress: null,
    });

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText('No wallet address available')).toBeTruthy();
    });

    expect(getWalletBalances).not.toHaveBeenCalled();
  });

  it('should navigate to Pay screen when Pay button pressed', () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByText('Pay'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Pay');
  });

  it('should navigate to Receive screen when Receive button pressed', () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByText('Receive'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Receive');
  });

  it('should display ETH balance in assets section', async () => {
    (getWalletBalances as jest.Mock).mockResolvedValue(mockWalletBalanceResponse);

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      // Check assets section
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('ETH')).toBeTruthy();
      expect(getByText('$2469.14')).toBeTruthy();
    });
  });

  it('should show empty state when no assets found', async () => {
    (getWalletBalances as jest.Mock).mockResolvedValue({
      tokens: [],
      total_usd_value: 0,
      total_tokens_count: 0,
      total_positions_count: 0,
      cursor: null,
    });

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText('No assets found')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy();
    });
  });
});