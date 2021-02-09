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
} from '..';

nodeSuite(ServerSideSuite);
nodeComponentSuite(ServerSideComponentSuite);

suite(DOMHelperTests, NodeJitRenderDelegate);
suite(SerializedDOMHelperTests, JitSerializationDelegate);
