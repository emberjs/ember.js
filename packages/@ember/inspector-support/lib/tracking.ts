/**
 * Property change tracking utilities for the Ember Inspector.
 *
 * This module implements the high-level tracking API proposed in the
 * Ember Inspector API Analysis. It wraps the low-level Glimmer tracking
 * primitives from @glimmer/validator to provide a stable, inspector-friendly
 * interface.
 *
 * The implementation of getTrackedDependencies and getChangedProperties is
 * based on the glimmer-vm PR #1489 (https://github.com/glimmerjs/glimmer-vm/pull/1489)
 * which adds these utilities to @glimmer/validator. Since that PR has not yet
 * been merged, we implement the equivalent logic here.
 */

import type { Tag } from '@glimmer/validator';
import { track, validateTag, valueForTag } from '@glimmer/validator';
import { tagForProperty } from '@ember/-internals/metal';
import type { PropertyTracker, PropertyDependency } from '../types';

// ---- Internal types ----

interface TagWithMeta extends Tag {
  /** Metadata attached to the tag (object + propertyKey). Set by tagFor() in @glimmer/validator. */
  meta?: { object: object; propertyKey: string } | null;
  /** Sub-tags that this tag depends on. */
  subtag?: Tag | Tag[] | null;
  /** The last revision value of this tag. */
  lastValue?: number;
}

interface InternalTracker {
  /** The combined tag tracking all dependencies of the property. */
  tag: TagWithMeta;
  /** The revision at the time of last check. */
  prevValue: number;
  /** Cached dependency info from the last getTrackedDependencies call. */
  dependencies?: {
    object: object;
    propertyKey: string;
    changed: boolean;
  }[];
}

// ---- Internal helpers ----

/**
 * Retrieve metadata (object + propertyKey) from a tag.
 * This mirrors the `infoForTag` function from glimmer-vm PR #1489.
 */
function infoForTag(tag: Tag): { object: object; propertyKey: string } | null {
  return (tag as TagWithMeta).meta ?? null;
}

/**
 * Collect all direct sub-tags from a combined tag.
 * Handles both single subtag and array of subtags.
 */
function collectSubtags(tag: TagWithMeta): TagWithMeta[] {
  const subtag = tag.subtag;
  if (!subtag) return [];
  if (Array.isArray(subtag)) {
    return subtag as TagWithMeta[];
  }
  return [subtag as TagWithMeta];
}

/**
 * Get tracked dependencies for a property on an object.
 *
 * This is the core implementation from glimmer-vm PR #1489's `getTrackedDependencies`.
 * It tracks the property access and inspects the resulting tag's subtags to
 * determine which tracked properties were accessed.
 *
 * @param obj - The object containing the property
 * @param property - The property name to inspect
 * @param info - Optional existing tracker info (for change detection)
 * @returns Updated tracker info with dependency list
 */
function getTrackedDependenciesInternal(
  obj: Record<string, unknown>,
  property: string,
  info?: InternalTracker
): InternalTracker {
  const result: InternalTracker = info ?? ({} as InternalTracker);

  // Track the property access to capture all dependencies
  const tag = (result.tag ?? track(() => obj[property])) as TagWithMeta;
  result.tag = tag;

  const dependencies: { object: object; propertyKey: string; tag: TagWithMeta }[] = [];

  // Collect all subtags (direct dependencies)
  const subtags = collectSubtags(tag);
  for (const subtag of subtags) {
    if ((subtag as Tag) === (tag as Tag)) continue;
    const depInfo = infoForTag(subtag);
    if (depInfo) {
      dependencies.push({ ...depInfo, tag: subtag });
    }
    // Also check one level deeper for chained dependencies
    const nestedSubtag = subtag.subtag;
    if (nestedSubtag && !Array.isArray(nestedSubtag)) {
      const nestedInfo = infoForTag(nestedSubtag as Tag);
      if (nestedInfo) {
        dependencies.push({ ...nestedInfo, tag: nestedSubtag as TagWithMeta });
      }
    }
  }

  const maxRevision = valueForTag(tag);
  const hasChange = result.prevValue !== undefined && maxRevision !== result.prevValue;

  result.dependencies = dependencies.map((dep) => {
    const changed = hasChange && (dep.tag.lastValue ?? 0) > (result.prevValue ?? 0);
    return { object: dep.object, propertyKey: dep.propertyKey, changed };
  });

  result.prevValue = maxRevision;

  return result;
}

// ---- Public API ----

export const tracking = {
  /**
   * Create a change tracker for a property.
   * Returns an opaque tracker object used to detect changes.
   *
   * @param obj - The object to track
   * @param key - The property name to track
   * @returns A tracker object (opaque to inspector)
   */
  createPropertyTracker(obj: object, key: string): PropertyTracker {
    const tag = tagForProperty(obj, key) as TagWithMeta;
    const tracker: InternalTracker = {
      tag,
      prevValue: valueForTag(tag),
    };
    return tracker as unknown as PropertyTracker;
  },

  /**
   * Check if a tracked property has changed since the tracker was created
   * or since the last call to this function.
   *
   * @param tracker - The tracker returned by createPropertyTracker
   * @returns true if the property has changed
   */
  hasPropertyChanged(tracker: PropertyTracker): boolean {
    const internal = tracker as unknown as InternalTracker;
    if (!internal.tag) return false;

    const changed = !validateTag(internal.tag, internal.prevValue);
    if (changed) {
      // Update the revision so subsequent calls reflect the new baseline
      internal.prevValue = valueForTag(internal.tag);
    }
    return changed;
  },

  /**
   * Get information about what a property depends on.
   * Includes both computed property dependent keys and tracked properties.
   *
   * @param obj - The object
   * @param key - The property name
   * @returns Array of dependency information
   */
  getPropertyDependencies(obj: object, key: string): PropertyDependency[] {
    try {
      const info = getTrackedDependenciesInternal(obj as Record<string, unknown>, key);
      return (info.dependencies ?? []).map((dep) => ({
        object: dep.object,
        propertyKey: dep.propertyKey,
        changed: dep.changed,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get detailed dependency information including which dependencies changed.
   * Used when a property has changed to show what caused the change.
   *
   * @param obj - The object
   * @param key - The property name
   * @param tracker - The tracker for this property
   * @returns Array of dependencies with change information
   */
  getChangedDependencies(obj: object, key: string, tracker: PropertyTracker): PropertyDependency[] {
    try {
      const internal = tracker as unknown as InternalTracker;
      const info = getTrackedDependenciesInternal(obj as Record<string, unknown>, key, internal);
      return (info.dependencies ?? []).map((dep) => ({
        object: dep.object,
        propertyKey: dep.propertyKey,
        changed: dep.changed,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Check if a property uses tracking (either @tracked or computed with tracked deps).
   *
   * @param obj - The object
   * @param key - The property name
   * @returns true if the property uses Glimmer tracking
   */
  isTrackedProperty(obj: object, key: string): boolean {
    try {
      const tag = tagForProperty(obj, key) as TagWithMeta;
      // A property is tracked if it has a non-constant tag
      // CONSTANT_TAG has a revision of 0 and never changes
      return tag !== null && tag !== undefined && valueForTag(tag) > 0;
    } catch {
      return false;
    }
  },
};
