import { rawModule, BundlingRenderDelegate, WithDynamicVarsSuite } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] With Dynamic Vars Tests', WithDynamicVarsSuite, BundlingRenderDelegate, { componentModule: true });
