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
} from '..';

nodeSuite(ServerSideSuite);
nodeComponentSuite(ServerSideComponentSuite);

suite(DOMHelperTests, NodeJitRenderDelegate);
suite(SerializedDOMHelperTests, JitSerializationDelegate);

if (typeof process !== 'undefined') {
  suite(CompilationTests, NodeJitRenderDelegate);
}
