import { registerBuiltInKeywordHelper } from '../resolver';
import { mountHelper } from './mount';
import { outletHelper } from './outlet';

registerBuiltInKeywordHelper('-mount', mountHelper);
registerBuiltInKeywordHelper('-outlet', outletHelper);
