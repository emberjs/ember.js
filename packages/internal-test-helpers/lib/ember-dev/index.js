import DeprecationAssert from './deprecation';
import WarningAssert from './warning';

import { buildCompositeAssert } from './utils';

var EmberDevTestHelperAssert = buildCompositeAssert([DeprecationAssert, WarningAssert]);

export default EmberDevTestHelperAssert;
