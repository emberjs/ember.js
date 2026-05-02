// Side-effect-only module: registers `DebugRenderTreeImpl` as the factory
// used by `EnvironmentImpl` when `delegate.enableDebugTooling` is true.
//
// Importing this file pulls `./debug-render-tree` into the bundle. Apps
// that don't need render-tree introspection (anything not running the
// Ember Inspector) shouldn't import this module — `EnvironmentImpl`'s
// `debugRenderTree` will silently stay `undefined`, which is the same
// behavior you'd get with `enableDebugTooling: false`.

import DebugRenderTreeImpl from './debug-render-tree';
import { registerDebugRenderTreeFactory } from './environment';

registerDebugRenderTreeFactory(() => new DebugRenderTreeImpl());
