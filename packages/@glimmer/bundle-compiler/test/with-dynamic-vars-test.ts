import { rawModule, EagerRenderDelegate, WithDynamicVarsSuite } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] With Dynamic Vars Tests', WithDynamicVarsSuite, EagerRenderDelegate, { componentModule: true });
