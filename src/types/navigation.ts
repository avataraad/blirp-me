import { VerifiedToken } from '../config/tokens';
import { TokenWithBalance } from '../services/tokenService';

export type RootStackParamList = {
    Welcome: undefined;
    PhoneNumber: undefined;
    PhoneVerification: { phoneNumber: string; e164PhoneNumber: string };
    CreateWallet: undefined;
    CreateWalletTag: { phoneNumber: string; e164PhoneNumber: string };
    SignIn: undefined;
    MainTabs: undefined;
    SupabaseTest: undefined;
    TradeReview: {
      tradeMode: 'buy' | 'sell';
      tradeType: 'manual' | 'auto';
      fromToken: TokenWithBalance;
      toToken: TokenWithBalance;
      amountUSD: string;
      amountWei: string;
    };
  };

  export type MainTabParamList = {
    Home: undefined;
    Pay: undefined;
    Trade: undefined;
    Receive: undefined;
  };
