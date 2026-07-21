// Build-time flags gating legacy sections of Ember. In the standard build
// every flag is true. Variant builds (see rollup.config.mjs) fold selected
// flags to false via babel-plugin-debug-macros so the gated code is
// tree-shaken out of the published modules.
//
// Dependencies between sections are enforced by the build config
// (broccoli/legacy-features.cjs): CLASSIC_COMPONENTS requires
// CLASSIC_OBJECT_MODEL, since classic components extend EmberObject.

/** The classic object model: EmberObject, Mixin, computed properties,
 * observers as public API, array/object proxies, EmberArray, Evented. */
export const CLASSIC_OBJECT_MODEL = true;

/** Classic (curly) components and the EventDispatcher that serves them. */
export const CLASSIC_COMPONENTS = true;

/** Controllers and the controller-based query params system. Independent of
 * CLASSIC_OBJECT_MODEL; slated for removal once a Route Manager-based query
 * params replacement exists (RFC #1169). */
export const CONTROLLER_QUERY_PARAMS = true;
