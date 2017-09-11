import { rawModule, ScopeSuite, BundlingRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Scope Tests', ScopeSuite, BundlingRenderDelegate, { componentModule: true });
