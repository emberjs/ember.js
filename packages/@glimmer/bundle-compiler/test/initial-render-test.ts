import {
  InitialRenderSuite,
  rawModule,
  EagerRenderDelegate
} from "@glimmer/test-helpers";

// module("[Bundle Compiler] Rehydration Tests", Rehydration);
rawModule("[Bundle Compiler] Initial Render Tests", InitialRenderSuite, EagerRenderDelegate);
