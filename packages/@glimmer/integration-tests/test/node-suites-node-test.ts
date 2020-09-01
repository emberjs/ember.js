import {
  nodeComponentSuite,
  nodeSuite,
  ServerSideComponentSuite,
  ServerSideSuite,
  suite,
  DOMHelperTests,
  NodeJitRenderDelegate,
  SerializedDOMHelperTests,
  JitSerializationDelegate,
  CompilationTests,
} from '..';

nodeSuite(ServerSideSuite);
nodeComponentSuite(ServerSideComponentSuite);

suite(DOMHelperTests, NodeJitRenderDelegate);
suite(SerializedDOMHelperTests, JitSerializationDelegate);

if (typeof process !== 'undefined') {
  suite(CompilationTests, NodeJitRenderDelegate);
}
