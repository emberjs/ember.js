import {
  aotComponentSuite,
  aotSuite,
  BasicComponents,
  BundleCompilerEmberTests,
  DebuggerSuite,
  EachSuite,
  EmberishComponentTests,
  FragmentComponents,
  HasBlockParamsHelperSuite,
  HasBlockSuite,
  InElementSuite,
  InitialRenderSuite,
  ScopeSuite,
  ShadowingSuite,
  WithDynamicVarsSuite,
  YieldSuite,
  EntryPointTest,
} from '@glimmer/integration-tests';

aotSuite(DebuggerSuite);
aotSuite(EachSuite);
aotSuite(InElementSuite);
aotSuite(InitialRenderSuite);
aotSuite(EntryPointTest);

aotComponentSuite(BasicComponents);
aotComponentSuite(FragmentComponents);
aotComponentSuite(EmberishComponentTests);
aotComponentSuite(HasBlockSuite);
aotComponentSuite(HasBlockParamsHelperSuite);
aotComponentSuite(ScopeSuite);
aotComponentSuite(ShadowingSuite);
aotComponentSuite(WithDynamicVarsSuite);
aotComponentSuite(YieldSuite);
aotComponentSuite(BundleCompilerEmberTests);
