import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// Import screens (we'll create these next)
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateWalletScreen from '../screens/CreateWalletScreen';
import SignInScreen from '../screens/SignInScreen';
import HomeScreen from '../screens/HomeScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import PayScreen from '../screens/PayScreen';
import SupabaseTestScreen from '../screens/SupabaseTestScreen';

// Import navigation types
import { RootStackParamList, MainTabParamList } from '../types/navigation';

console.log('WelcomeScreen:', WelcomeScreen);
console.log('Type:', typeof WelcomeScreen);

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon renderer
const TabBarIcon = ({ route, focused, color, size }: {
  route: { name: string };
  focused: boolean;
  color: string;
  size: number;
}) => {
  let iconName: string = '';

  if (route.name === 'Home') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === 'Pay') {
    iconName = focused ? 'send' : 'send-outline';
  } else if (route.name === 'Receive') {
    iconName = focused ? 'download' : 'download-outline';
  }

  return <Icon name={iconName} size={size} color={color} />;
};

// Main tab navigator for authenticated users
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon route={route} focused={focused} color={color} size={size} />
        ),
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 10,
          paddingTop: 10,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Receive" component={ReceiveScreen} />
    </Tab.Navigator>
  );
};

// Main app navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: '600',
          },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateWallet"
          component={CreateWalletScreen}
          options={{ title: 'Create Wallet' }}
        />
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ title: 'Sign In' }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupabaseTest"
          component={SupabaseTestScreen}
          options={{ title: 'Supabase Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
