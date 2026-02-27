/**
 * @ember/inspector-support
 *
 * Public API for the Ember Inspector to access Ember internals in a stable,
 * version-independent way. This package is intended to be accessed by the
 * Ember Inspector via `appLoader.loadCompatInspector()`.
 *
 * ## Usage
 *
 * ```javascript
 * // In ember-inspector:
 * const api = globalThis.emberInspectorApps[0].loadCompatInspector();
 *
 * // Use the API:
 * const renderTree = api.debug.captureRenderTree();
 * const guid = api.objectInternals.guidFor(someObject);
 * const tracker = api.tracking.createPropertyTracker(obj, 'myProp');
 * ```
 *
 * ## Design Goals
 *
 * - **Stability**: Public API contract prevents breaking changes
 * - **Simplicity**: High-level APIs are easier to use and understand
 * - **Encapsulation**: Implementation details hidden behind function boundaries
 * - **Reduced Coupling**: Inspector doesn't need to import or reference Ember classes
 *
 * @module @ember/inspector-support
 * @public
 */

export { debug } from './lib/debug';
export { environment } from './lib/environment';
export { instrumentation } from './lib/instrumentation';
export { objectInternals } from './lib/object-internals';
export { owner } from './lib/owner';
export { libraries } from './lib/libraries';
export { typeChecking } from './lib/type-checking';
export { naming } from './lib/naming';
export { tracking } from './lib/tracking';
export { computed } from './lib/computed';
export { renderTree } from './lib/render-tree';
export { runloop } from './lib/runloop';

export type {
  EmberInspectorAPI,
  RenderNode,
  Bounds,
  Library,
  Owner,
  PropertyTracker,
  PropertyDependency,
  ComputedMetadata,
  DeprecationOptions,
  DeprecationHandler,
  InstrumentationCallbacks,
  EmberEnvironment,
  ContainerInstance,
  GetContainerInstancesOptions,
} from './types';

import { debug } from './lib/debug';
import { environment } from './lib/environment';
import { instrumentation } from './lib/instrumentation';
import { objectInternals } from './lib/object-internals';
import { owner } from './lib/owner';
import { libraries } from './lib/libraries';
import { typeChecking } from './lib/type-checking';
import { naming } from './lib/naming';
import { tracking } from './lib/tracking';
import { computed } from './lib/computed';
import { renderTree } from './lib/render-tree';
import { runloop } from './lib/runloop';
import type { EmberInspectorAPI } from './types';

/**
 * The complete Ember Inspector API object.
 *
 * This is the object returned by `appLoader.loadCompatInspector()`.
 * It provides a stable, high-level interface for the Ember Inspector
 * to access Ember internals without depending on private APIs.
 */
export const emberInspectorAPI: EmberInspectorAPI = {
  debug,
  environment,
  instrumentation,
  objectInternals,
  owner,
  libraries,
  typeChecking,
  naming,
  tracking,
  computed,
  renderTree,
  runloop,
};

export default emberInspectorAPI;
