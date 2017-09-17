import {
  SSRSuite,
  SSRComponentSuite,
  rawModule,
  NodeEagerRenderDelegate
} from "@glimmer/test-helpers";

rawModule("[Bundle Compiler] SSR", SSRSuite, NodeEagerRenderDelegate);
rawModule("[Bundle Compiler] SSR Components", SSRComponentSuite, NodeEagerRenderDelegate, { componentModule: true });
