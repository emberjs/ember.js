import { rawModule, YieldSuite, EagerRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Yield Tests', YieldSuite, EagerRenderDelegate, { componentModule: true });
