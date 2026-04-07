export { Test, Adapter } from './lib/public-api';
// NOTE: import * is intentional here -- the namespace object is passed to registerTestImplementation
import * as EmberTesting from './lib/public-api';
import { registerTestImplementation } from '@ember/test';

registerTestImplementation(EmberTesting);
