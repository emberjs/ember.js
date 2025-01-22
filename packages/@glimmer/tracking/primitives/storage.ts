export { createStorage, getValue, setValue } from '@ember/-internals/metal/lib/storage';

/**
 * NOTE: '@ember/-internals/metal' already exports a getValue function
 *       from @glimmer/tracking/primitives/cache.ts,
 *       so we can't use the pattern of re-export everything from
 *       @ember/-internals/metal
 *
 *       At somepoint we need to untangle all that actually move things to their appropriate packages.
 */
