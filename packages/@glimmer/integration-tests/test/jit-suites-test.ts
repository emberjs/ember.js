import {
  jitSuite,
  GlimmerishComponents,
  TemplateOnlyComponents,
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
} from '..';

jitSuite(DebuggerSuite);
jitSuite(EachSuite);
jitSuite(InElementSuite);

jitComponentSuite(GlimmerishComponents);
jitComponentSuite(TemplateOnlyComponents);
jitComponentSuite(EmberishComponentTests);
jitComponentSuite(HasBlockSuite);
jitComponentSuite(HasBlockParamsHelperSuite);
jitComponentSuite(ScopeSuite);
jitComponentSuite(ShadowingSuite);
jitComponentSuite(WithDynamicVarsSuite);
jitComponentSuite(YieldSuite);
