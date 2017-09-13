import { rawModule, ScopeSuite, EagerRenderDelegate } from "@glimmer/test-helpers";

rawModule('[Bundle Compiler] Scope Tests', ScopeSuite, EagerRenderDelegate, { componentModule: true });
