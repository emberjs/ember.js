import DeprecationAssert from "./deprecation";
import WarningAssert from "./warning";
import RemainingViewAssert from "./remaining-view";
import RemainingTemplateAssert from "./remaining-template";
import AssertionAssert from "./assertion";
import RunLoopAssert from "./run-loop";

import {buildCompositeAssert} from "./utils";

var EmberDevTestHelperAssert = buildCompositeAssert([
  DeprecationAssert,
  WarningAssert,
  RemainingViewAssert,
  RemainingTemplateAssert,
  AssertionAssert,
  RunLoopAssert
]);

export default EmberDevTestHelperAssert;
