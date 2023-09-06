export * from './public-api';
import * as EmberTesting from './public-api';
import { registerTestImplementaiton } from '@ember/test';

registerTestImplementaiton(EmberTesting);
