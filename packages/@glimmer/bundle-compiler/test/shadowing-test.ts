import { rawModule, ShadowingSuite, EagerRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Shadowing Tests', ShadowingSuite, EagerRenderDelegate, { componentModule: true });
