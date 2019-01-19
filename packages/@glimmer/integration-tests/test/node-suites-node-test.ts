import {
  nodeComponentSuite,
  nodeSuite,
  ServerSideComponentSuite,
  ServerSideSuite,
  suite,
  DOMHelperTests,
  NodeJitRenderDelegate,
  NodeAotRenderDelegate,
  SerializedDOMHelperTests,
  JitSerializationDelegate,
  AotSerializationDelegate,
  CompilationTests,
  componentSuite,
} from '@glimmer/integration-tests';

nodeSuite(ServerSideSuite);
nodeComponentSuite(ServerSideComponentSuite);

suite(DOMHelperTests, NodeJitRenderDelegate);
suite(DOMHelperTests, NodeAotRenderDelegate);
suite(SerializedDOMHelperTests, JitSerializationDelegate);
suite(SerializedDOMHelperTests, AotSerializationDelegate);

if (typeof process !== 'undefined') {
  suite(CompilationTests, NodeJitRenderDelegate);
}

componentSuite(ServerSideComponentSuite, NodeAotRenderDelegate);
