import {
  jitSuite,
  BasicComponents,
  FragmentComponents,
  DebuggerSuite,
  EachSuite,
  EmberishComponentTests,
  HasBlockParamsHelperSuite,
  HasBlockSuite,
  InElementSuite,
  ScopeSuite,
  ShadowingSuite,
  WithDynamicVarsSuite,
  YieldSuite,
  jitComponentSuite,
} from '@glimmer/integration-tests';

jitSuite(DebuggerSuite);
jitSuite(EachSuite);
jitSuite(InElementSuite);

jitComponentSuite(BasicComponents);
jitComponentSuite(FragmentComponents);
jitComponentSuite(EmberishComponentTests);
jitComponentSuite(HasBlockSuite);
jitComponentSuite(HasBlockParamsHelperSuite);
jitComponentSuite(ScopeSuite);
jitComponentSuite(ShadowingSuite);
jitComponentSuite(WithDynamicVarsSuite);
jitComponentSuite(YieldSuite);
