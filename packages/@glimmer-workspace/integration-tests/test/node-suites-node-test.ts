import {
  CompilationTests,
  DOMHelperTests,
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

suite(DOMHelperTests, NodeJitRenderDelegate);
suite(SerializedDOMHelperTests, JitSerializationDelegate);

if (typeof (globalThis as any).process !== 'undefined') {
  suite(CompilationTests, NodeJitRenderDelegate);
}
