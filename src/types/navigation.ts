import { TokenWithBalance } from '../services/tokenService';

export type RootStackParamList = {
    Welcome: undefined;
    PhoneNumber: undefined;
    PhoneVerification: { phoneNumber: string; e164PhoneNumber: string };
    CreateWallet: undefined;
    CreateWalletTag: { phoneNumber: string; e164PhoneNumber: string };
    CreatePortoWallet: undefined;
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
    Settings: undefined;
  };

  export type MainTabParamList = {
    Home: undefined;
    Pay: undefined;
    Trade: undefined;
    Receive: undefined;
  };
