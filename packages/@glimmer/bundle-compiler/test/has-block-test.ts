import { rawModule, HasBlockSuite, BundlingRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Has Block', HasBlockSuite, BundlingRenderDelegate, { componentModule: true });
