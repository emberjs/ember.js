import DeprecationAssert from './deprecation';
import WarningAssert from './warning';
import AssertionAssert from './assertion';

import { buildCompositeAssert } from './utils';

var EmberDevTestHelperAssert = buildCompositeAssert([
  DeprecationAssert,
  WarningAssert,
  AssertionAssert,
]);

export default EmberDevTestHelperAssert;
