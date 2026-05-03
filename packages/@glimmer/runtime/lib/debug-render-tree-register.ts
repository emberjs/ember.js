import DebugRenderTreeImpl from './debug-render-tree';
import { registerDebugRenderTreeFactory } from './environment';

registerDebugRenderTreeFactory(() => new DebugRenderTreeImpl());
