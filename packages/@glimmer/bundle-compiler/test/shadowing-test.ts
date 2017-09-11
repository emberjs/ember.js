import { rawModule, ShadowingSuite, BundlingRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Shadowing Tests', ShadowingSuite, BundlingRenderDelegate, { componentModule: true });
