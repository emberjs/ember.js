import DeprecationAssert from './deprecation';
import WarningAssert from './warning';
import AssertionAssert from './assertion';
import RunLoopAssert from './run-loop';
import NamespacesAssert from './namespaces';
import ContainersAssert from './containers';

import { buildCompositeAssert } from './utils';

var EmberDevTestHelperAssert = buildCompositeAssert([
  DeprecationAssert,
  WarningAssert,
  AssertionAssert,
  RunLoopAssert,
  NamespacesAssert,
  ContainersAssert,
]);

export default EmberDevTestHelperAssert;
