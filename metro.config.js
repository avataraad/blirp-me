const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      // Polyfills for crypto functionality needed by viem
      'crypto': 'react-native-get-random-values',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
