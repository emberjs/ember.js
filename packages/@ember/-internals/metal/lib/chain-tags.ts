import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { isObject } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { _WeakSet } from '@glimmer/util';
import {
  combine,
  createUpdatableTag,
  Tag,
  TagMeta,
  tagMetaFor,
  updateTag,
  validateTag,
} from '@glimmer/validator';
import { objectAt } from './array';
import { tagForProperty } from './tags';

export const CHAIN_PASS_THROUGH = new _WeakSet();

export function finishLazyChains(meta: Meta, key: string, value: any) {
  let lazyTags = meta.readableLazyChainsFor(key);

  if (lazyTags === undefined) {
    return;
  }

  if (isObject(value)) {
    for (let [tag, deps] of lazyTags) {
      updateTag(tag, getChainTagsForKey(value, deps as string, tagMetaFor(value), peekMeta(value)));
    }
  }

  lazyTags.length = 0;
}

export function getChainTagsForKeys(
  obj: object,
  keys: string[],
  tagMeta: TagMeta,
  meta: Meta | null
): Tag {
  let tags: Tag[] = [];

  for (let key of keys) {
    getChainTags(tags, obj, key, tagMeta, meta);
  }

  return combine(tags);
}

export function getChainTagsForKey(
  obj: object,
  key: string,
  tagMeta: TagMeta,
  meta: Meta | null
): Tag {
  return combine(getChainTags([], obj, key, tagMeta, meta));
}

function getChainTags(
  chainTags: Tag[],
  obj: object,
  path: string,
  tagMeta: TagMeta,
  meta: Meta | null
) {
  let current: any = obj;
  let currentTagMeta = tagMeta;
  let currentMeta = meta;

  let pathLength = path.length;
  let segmentEnd = -1;
  // prevent closures
  let segment: string, descriptor: any;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let lastSegmentEnd = segmentEnd + 1;
    segmentEnd = path.indexOf('.', lastSegmentEnd);

    if (segmentEnd === -1) {
      segmentEnd = pathLength;
    }

    segment = path.slice(lastSegmentEnd, segmentEnd);

    // If the segment is an @each, we can process it and then break
    if (segment === '@each' && segmentEnd !== pathLength) {
      lastSegmentEnd = segmentEnd + 1;
      segmentEnd = path.indexOf('.', lastSegmentEnd);

      let arrLength = current.length;

      if (
        typeof arrLength !== 'number' ||
        // TODO: should the second test be `isEmberArray` instead?
        !(Array.isArray(current) || 'objectAt' in current)
      ) {
        // If the current object isn't an array, there's nothing else to do,
        // we don't watch individual properties. Break out of the loop.
        break;
      } else if (arrLength === 0) {
        // Fast path for empty arrays
        chainTags.push(tagForProperty(current, '[]'));
        break;
      }

      if (segmentEnd === -1) {
        segment = path.slice(lastSegmentEnd);
      } else {
        // Deprecated, remove once we turn the deprecation into an assertion
        segment = path.slice(lastSegmentEnd, segmentEnd);
      }

      // Push the tags for each item's property
      for (let i = 0; i < arrLength; i++) {
        let item = objectAt(current as Array<any>, i);

        if (item) {
          assert(
            `When using @each to observe the array \`${current.toString()}\`, the items in the array must be objects`,
            typeof item === 'object'
          );

          chainTags.push(tagForProperty(item, segment, true));

          currentMeta = peekMeta(item);
          descriptor = currentMeta !== null ? currentMeta.peekDescriptors(segment) : undefined;

          // If the key is an alias, we need to bootstrap it
          if (descriptor !== undefined && typeof descriptor.altKey === 'string') {
            item[segment];
          }
        }
      }

      // Push the tag for the array length itself
      chainTags.push(tagForProperty(current, '[]', true, currentTagMeta));

      break;
    }

    let propertyTag = tagForProperty(current, segment, true, currentTagMeta);
    descriptor = currentMeta !== null ? currentMeta.peekDescriptors(segment) : undefined;

    chainTags.push(propertyTag);

    // If we're at the end of the path, processing the last segment, and it's
    // not an alias, we should _not_ get the last value, since we already have
    // its tag. There's no reason to access it and do more work.
    if (segmentEnd === pathLength) {
      // If the key was an alias, we should always get the next value in order to
      // bootstrap the alias. This is because aliases, unlike other CPs, should
      // always be in sync with the aliased value.
      if (CHAIN_PASS_THROUGH.has(descriptor)) {
        current[segment];
      }
      break;
    }

    if (descriptor === undefined) {
      // If the descriptor is undefined, then its a normal property, so we should
      // lookup the value to chain off of like normal.

      if (!(segment in current) && typeof current.unknownProperty === 'function') {
        current = current.unknownProperty(segment);
      } else {
        current = current[segment];
      }
    } else if (CHAIN_PASS_THROUGH.has(descriptor)) {
      current = current[segment];
    } else {
      // If the descriptor is defined, then its a normal CP (not an alias, which
      // would have been handled earlier). We get the last revision to check if
      // the CP is still valid, and if so we use the cached value. If not, then
      // we create a lazy chain lookup, and the next time the CP is calculated,
      // it will update that lazy chain.
      let instanceMeta = currentMeta!.source === current ? currentMeta! : metaFor(current);
      let lastRevision = instanceMeta.revisionFor(segment);

      if (lastRevision !== undefined && validateTag(propertyTag, lastRevision)) {
        current = instanceMeta.valueFor(segment);
      } else {
        // use metaFor here to ensure we have the meta for the instance
        let lazyChains = instanceMeta.writableLazyChainsFor(segment);
        let rest = path.substr(segmentEnd + 1);

        let placeholderTag = createUpdatableTag();

        lazyChains.push([placeholderTag, rest]);
        chainTags.push(placeholderTag);

        break;
      }
    }

    if (!isObject(current)) {
      // we've hit the end of the chain for now, break out
      break;
    }

    currentTagMeta = tagMetaFor(current);
    currentMeta = peekMeta(current);
  }

  return chainTags;
}
