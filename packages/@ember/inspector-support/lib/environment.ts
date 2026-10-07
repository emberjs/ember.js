import { ENV } from '@ember/-internals/environment';
import VERSION from 'ember/version';
import type { EmberEnvironment } from '../types';

export const environment = {
  /**
   * Get Ember's environment configuration.
   */
  getEnv(): EmberEnvironment {
    return ENV as EmberEnvironment;
  },

  /**
   * The current Ember version string.
   */
  VERSION,
};
