import {
  ComponentInvocationTests,
  DebuggerSuite,
  EachSuite,
  GlimmerComponents,
  HasBlockParamsHelperSuite,
  HasBlockSuite,
  InElementSuite,
  jitComponentSuite,
  jitSuite,
  ScopeSuite,
  ShadowingSuite,
  TemplateOnlyComponents,
  WithDynamicVarsSuite,
  YieldSuite,
} from '@glimmer-workspace/integration-tests';

jitComponentSuite(DebuggerSuite);
jitSuite(EachSuite);
jitSuite(InElementSuite);

jitComponentSuite(GlimmerComponents);
jitComponentSuite(TemplateOnlyComponents);
jitComponentSuite(ComponentInvocationTests);
jitComponentSuite(HasBlockSuite);
jitComponentSuite(HasBlockParamsHelperSuite);
jitComponentSuite(ScopeSuite);
jitComponentSuite(ShadowingSuite);
jitComponentSuite(WithDynamicVarsSuite);
jitComponentSuite(YieldSuite);
