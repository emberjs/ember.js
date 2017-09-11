import {
  SSRSuite,
  SSRComponentSuite,
  rawModule,
  NodeBundlingRenderDelegate
} from "@glimmer/test-helpers";

rawModule("[Bundle Compiler] SSR", SSRSuite, NodeBundlingRenderDelegate);
rawModule("[Bundle Compiler] SSR Components", SSRComponentSuite, NodeBundlingRenderDelegate, { componentModule: true });
