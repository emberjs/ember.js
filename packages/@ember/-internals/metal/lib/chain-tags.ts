import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { isObject } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import {
  ALLOW_CYCLES,
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

export function finishLazyChains(meta: Meta, key: string, value: any) {
  let lazyTags = meta.readableLazyChainsFor(key);

  if (lazyTags === undefined) {
    return;
  }

  if (isObject(value)) {
    for (let i = 0; i < lazyTags.length; i++) {
      let [tag, deps] = lazyTags[i];
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

  for (let i = 0; i < keys.length; i++) {
    getChainTags(tags, obj, keys[i], tagMeta, meta);
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

      // There should be exactly one segment after an `@each` (i.e. `@each.foo`, not `@each.foo.bar`)
      deprecate(
        `When using @each in a dependent-key or an observer, ` +
          `you can only chain one property level deep after ` +
          `the @each. That is, \`${path.slice(0, segmentEnd)}\` ` +
          `is allowed but \`${path}\` (which is what you passed) ` +
          `is not.\n\n` +
          `This was never supported. Currently, the extra segments ` +
          `are silently ignored, i.e. \`${path}\` behaves exactly ` +
          `the same as \`${path.slice(0, segmentEnd)}\`. ` +
          `In the future, this will throw an error.\n\n` +
          `If the current behavior is acceptable for your use case, ` +
          `please remove the extraneous segments by changing your ` +
          `key to \`${path.slice(0, segmentEnd)}\`. ` +
          `Otherwise, please create an intermediary computed property ` +
          `or switch to using tracked properties.`,
        segmentEnd === -1,
        {
          until: '3.17.0',
          id: 'ember-metal.computed-deep-each',
        }
      );

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
      if (descriptor !== undefined && typeof descriptor.altKey === 'string') {
        // tslint:disable-next-line: no-unused-expression
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
    } else if (typeof descriptor.altKey === 'string') {
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

  if (DEBUG) {
    chainTags.forEach(t => ALLOW_CYCLES!.set(t, true));
  }

  return chainTags;
}
