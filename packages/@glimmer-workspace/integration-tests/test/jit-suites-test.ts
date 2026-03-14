import {
  DebuggerSuite,
  EachSuite,
  EmberishComponentTests,
  GlimmerishComponents,
  HasBlockParamsHelperSuite,
  HasBlockSuite,
  InElementDocumentFragmentSuite,
  InElementShadowRootSuite,
  InElementSuite,
  jitComponentSuite,
  jitSuite,
  ScopeSuite,
  ShadowDOMSuite,
  ShadowingSuite,
  TemplateOnlyComponents,
  WithDynamicVarsSuite,
  YieldSuite,
} from '@glimmer-workspace/integration-tests';

jitComponentSuite(DebuggerSuite);
jitSuite(EachSuite);
jitSuite(InElementSuite);
jitSuite(InElementDocumentFragmentSuite);
jitSuite(InElementShadowRootSuite);
jitSuite(ShadowDOMSuite);

jitComponentSuite(GlimmerishComponents);
jitComponentSuite(TemplateOnlyComponents);
jitComponentSuite(EmberishComponentTests);
jitComponentSuite(HasBlockSuite);
jitComponentSuite(HasBlockParamsHelperSuite);
jitComponentSuite(ScopeSuite);
jitComponentSuite(ShadowingSuite);
jitComponentSuite(WithDynamicVarsSuite);
jitComponentSuite(YieldSuite);
