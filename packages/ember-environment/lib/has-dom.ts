import { ENV } from './env';
import global from './global';

// check if window exists and actually is the global
const hasDOM =
  typeof window !== 'undefined' &&
  window === global &&
  window.document &&
  window.document.createElement &&
  !(ENV as any).disableBrowserEnvironment; // is this a public thing?

declare const InstallTrigger: any | undefined;

// TODO: cleanup single source of truth issues with this stuff
export const environment = hasDOM
  ? {
      hasDOM: true,
      isChrome: !!(window as any).chrome && !(window as any).opera,
      isFirefox: typeof InstallTrigger !== 'undefined',
      location: window.location,
      history: window.history,
      userAgent: window.navigator.userAgent,
      window,
    }
  : {
      hasDOM: false,
      isChrome: false,
      isFirefox: false,
      location: null,
      history: null,
      userAgent: 'Lynx (textmode)',
      window: null,
    };
