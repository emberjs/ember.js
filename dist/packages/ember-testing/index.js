export * from './lib/public-api';
import * as EmberTesting from './lib/public-api';
import { registerTestImplementaiton } from '@ember/test';
registerTestImplementaiton(EmberTesting);