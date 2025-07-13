// Crypto polyfills for React Native wagmi/viem support
import 'react-native-get-random-values';
import 'event-target-polyfill';

// Global polyfills for crypto
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Set up globals for viem compatibility
if (typeof global.process === 'undefined') {
  global.process = require('process');
}

// Event polyfills for React Native
class MockEvent {
  type: string;
  target: any;
  currentTarget: any;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;

  constructor(type: string, options: any = {}) {
    this.type = type;
    this.target = null;
    this.currentTarget = null;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {}
  stopImmediatePropagation() {}
}

class MockCustomEvent extends MockEvent {
  detail: any;

  constructor(type: string, options: any = {}) {
    super(type, options);
    this.detail = options.detail || null;
  }
}

class MockEventTarget {
  private listeners: Map<string, Function[]> = new Map();

  addEventListener(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type)!;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: MockEvent) {
    if (this.listeners.has(event.type)) {
      const listeners = this.listeners.get(event.type)!;
      listeners.forEach(listener => listener(event));
    }
    return true;
  }
}

// Set up global Event polyfills
if (typeof global.Event === 'undefined') {
  global.Event = MockEvent as any;
}

if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = MockCustomEvent as any;
}

if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = MockEventTarget as any;
}

// DOM polyfills for wagmi/viem
if (typeof global.window === 'undefined') {
  global.window = new MockEventTarget() as any;
}

// Add missing window methods
Object.assign(global.window, {
  addEventListener: global.window.addEventListener || (() => {}),
  removeEventListener: global.window.removeEventListener || (() => {}),
  dispatchEvent: global.window.dispatchEvent || (() => true),
  CustomEvent: global.CustomEvent,
  Event: global.Event,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  },
  requestAnimationFrame: (callback: Function) => setTimeout(callback, 16),
  cancelAnimationFrame: clearTimeout,
  requestIdleCallback: (callback: Function) => setTimeout(callback, 1),
  cancelIdleCallback: clearTimeout,
  getComputedStyle: () => ({}),
  matchMedia: () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  }),
});

if (typeof global.document === 'undefined') {
  global.document = Object.assign(new MockEventTarget(), {
    addEventListener: function(type: string, listener: Function) { return MockEventTarget.prototype.addEventListener.call(this, type, listener); },
    removeEventListener: function(type: string, listener: Function) { return MockEventTarget.prototype.removeEventListener.call(this, type, listener); },
    dispatchEvent: function(event: MockEvent) { return MockEventTarget.prototype.dispatchEvent.call(this, event); },
    visibilityState: 'visible',
    hidden: false,
    createElement: () => new MockEventTarget(),
    createEvent: (type: string) => new MockEvent(type),
  });
}

// Location polyfill
if (typeof global.location === 'undefined') {
  global.location = {
    href: 'https://localhost',
    origin: 'https://localhost',
    protocol: 'https:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  };
}

// URL polyfill
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
}

// TextEncoder/TextDecoder polyfill
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Additional fetch polyfill if needed
if (typeof global.fetch === 'undefined') {
  // React Native has fetch built-in, but ensure it's available
  global.fetch = fetch;
}

// Additional global polyfills
if (typeof global.navigator === 'undefined') {
  global.navigator = {
    userAgent: 'React Native',
    platform: 'React Native',
    onLine: true,
  };
}

// AbortController polyfill (simple implementation)
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class AbortController {
    signal = {
      aborted: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
    
    abort() {
      this.signal.aborted = true;
    }
  } as any;
}

// Performance polyfill
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    timeOrigin: Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  } as any;
}

console.log('Crypto polyfills loaded successfully');
