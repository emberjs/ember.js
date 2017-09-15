import {
  SSRSuite,
  SSRComponentSuite,
  rawModule,
  NodeRenderDelegate
} from "@glimmer/test-helpers";

rawModule("[Bundle Compiler] SSR", SSRSuite, NodeRenderDelegate);
rawModule("[Bundle Compiler] SSR Components", SSRComponentSuite, NodeRenderDelegate, { componentModule: true });
