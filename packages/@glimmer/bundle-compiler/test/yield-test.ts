import { rawModule, YieldSuite, BundlingRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Yield Tests', YieldSuite, BundlingRenderDelegate, { componentModule: true });
