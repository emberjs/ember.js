import DeprecationAssert from "./deprecation";
import WarningAssert from "./warning";
import AssertionAssert from "./assertion";
import RunLoopAssert from "./run-loop";

import {buildCompositeAssert} from "./utils";

var EmberDevTestHelperAssert = buildCompositeAssert([
  DeprecationAssert,
  WarningAssert,
  AssertionAssert,
  RunLoopAssert
]);

export default EmberDevTestHelperAssert;
