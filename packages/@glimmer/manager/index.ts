export {
  getInternalComponentManager,
  getInternalHelperManager,
  getInternalModifierManager,
  hasInternalComponentManager,
  hasInternalHelperManager,
  hasInternalModifierManager,
  setInternalComponentManager,
  setInternalHelperManager,
  setInternalModifierManager,
} from './lib/internal/api';
export { componentCapabilities, CustomComponentManager } from './lib/public/component';
export {
  CustomHelperManager,
  hasDestroyable,
  hasValue,
  helperCapabilities,
} from './lib/public/helper';
export { setComponentManager, setHelperManager, setModifierManager } from './lib/public/index';
export { CustomModifierManager, modifierCapabilities } from './lib/public/modifier';
export { getComponentTemplate, setComponentTemplate } from './lib/public/template';
export { getCustomTagFor, setCustomTagFor } from './lib/util/args-proxy';
export { capabilityFlagsFrom, hasCapability, managerHasCapability } from './lib/util/capabilities';

// GXT hooks — no-ops in classic Glimmer VM mode.
// The compat shim at packages/@ember/-internals/gxt-backend/manager.ts exports
// real implementations; the rollup.config.mjs EMBER_RENDER_BACKEND=gxt alias
// routes through that shim instead.
export function beginRenderPass(): void {}
export function endRenderPass(): void {}
export function pushParentView(_view: unknown): void {}
export function popParentView(): void {}
export function flushAfterInsertQueue(): void {}
export function flushRenderErrors(): void {}
