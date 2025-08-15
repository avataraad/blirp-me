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
      'stream': 'readable-stream',
      'buffer': 'buffer',
      'url': 'url',
      'text-encoding': 'text-encoding',
    },
    // Ensure buffer polyfill is available globally
    extraNodeModules: {
      buffer: require.resolve('buffer'),
      stream: require.resolve('readable-stream'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
