export * from './lib/public-api';
import * as EmberTesting from './lib/public-api';
import { registerTestImplementation } from '@ember/test';

registerTestImplementation(EmberTesting);
