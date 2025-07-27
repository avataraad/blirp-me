export type RootStackParamList = {
    Welcome: undefined;
    PhoneNumber: undefined;
    PhoneVerification: { phoneNumber: string; e164PhoneNumber: string };
    CreateWallet: undefined;
    CreateWalletTag: { phoneNumber: string; e164PhoneNumber: string };
    SignIn: undefined;
    MainTabs: undefined;
    SupabaseTest: undefined;
  };

  export type MainTabParamList = {
    Home: undefined;
    Pay: undefined;
    Receive: undefined;
  };
