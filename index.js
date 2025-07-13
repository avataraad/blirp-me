/**
 * @format
 */

// IMPORTANT: Load polyfills first, before any other imports
import './src/utils/crypto-polyfill.ts';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
