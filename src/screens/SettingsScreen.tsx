import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { useSettings } from '../contexts/SettingsContext';
import { CHAIN_IDS, CHAIN_CONFIGS } from '../config/chains';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { enabledChains, toggleChain, isChainEnabled } = useSettings();

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Networks</Text>
          <Text style={styles.sectionDescription}>
            Select the blockchain network for your wallet
          </Text>

          {/* Base Network */}
          <View style={styles.networkItem}>
            <View style={styles.networkInfo}>
              <View style={styles.networkIcon}>
                <Text style={styles.networkEmoji}>🔵</Text>
              </View>
              <View style={styles.networkText}>
                <Text style={styles.networkName}>
                  {CHAIN_CONFIGS[CHAIN_IDS.BASE].name}
                </Text>
                <Text style={styles.networkDescription}>
                  Fast and affordable Layer 2
                </Text>
              </View>
            </View>
            <Switch
              value={isChainEnabled(CHAIN_IDS.BASE)}
              onValueChange={() => toggleChain(CHAIN_IDS.BASE)}
              trackColor={{ 
                false: theme.colors.border, 
                true: theme.colors.primary 
              }}
              thumbColor={theme.colors.background}
              ios_backgroundColor={theme.colors.border}
            />
          </View>

          {/* Ethereum Network */}
          <View style={styles.networkItem}>
            <View style={styles.networkInfo}>
              <View style={styles.networkIcon}>
                <Text style={styles.networkEmoji}>🔷</Text>
              </View>
              <View style={styles.networkText}>
                <Text style={styles.networkName}>
                  {CHAIN_CONFIGS[CHAIN_IDS.ETHEREUM].name}
                </Text>
                <Text style={styles.networkDescription}>
                  The original blockchain
                </Text>
              </View>
            </View>
            <Switch
              value={isChainEnabled(CHAIN_IDS.ETHEREUM)}
              onValueChange={() => toggleChain(CHAIN_IDS.ETHEREUM)}
              trackColor={{ 
                false: theme.colors.border, 
                true: theme.colors.primary 
              }}
              thumbColor={theme.colors.background}
              ios_backgroundColor={theme.colors.border}
            />
          </View>

          <View style={styles.note}>
            <Icon name="information-circle-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.noteText}>
              Only one network can be active at a time
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.title3,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32, // Same as back button to center title
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  networkEmoji: {
    fontSize: 20,
  },
  networkText: {
    flex: 1,
  },
  networkName: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  networkDescription: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  noteText: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
});

export default SettingsScreen;