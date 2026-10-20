import {
  CompilationTests,
  componentSuite,
  InteractiveJitSerializationDelegate,
  InteractiveNodeJitRenderDelegate,
  InteractiveSerializedDOMHelperTests,
  InteractiveServerSideSuite,
  JitSerializationDelegate,
  nodeComponentSuite,
  NodeJitRenderDelegate,
  nodeSuite,
  SerializedDOMHelperTests,
  ServerSideComponentSuite,
  ServerSideSuite,
  suite,
} from '@glimmer-workspace/integration-tests';

nodeSuite(ServerSideSuite);
nodeComponentSuite(ServerSideComponentSuite);

suite(InteractiveServerSideSuite, InteractiveNodeJitRenderDelegate);
componentSuite(ServerSideComponentSuite, InteractiveNodeJitRenderDelegate);

suite(SerializedDOMHelperTests, JitSerializationDelegate);
suite(InteractiveSerializedDOMHelperTests, InteractiveJitSerializationDelegate);

if (typeof (globalThis as any).process !== 'undefined') {
  suite(CompilationTests, NodeJitRenderDelegate);
}
