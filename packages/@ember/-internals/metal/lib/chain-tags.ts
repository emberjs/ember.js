import { meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { isEmberArray } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { combine, createUpdatableTag, Tag, update, validate } from '@glimmer/reference';
import { getLastRevisionFor, peekCacheFor } from './computed_cache';
import { descriptorForProperty } from './descriptor_map';
import { tagForProperty } from './tags';

export const ARGS_PROXY_TAGS = new WeakMap();

export function finishLazyChains(obj: any, key: string, value: any) {
  let meta = peekMeta(obj);
  let lazyTags = meta !== null ? meta.readableLazyChainsFor(key) : undefined;

  if (lazyTags === undefined) {
    return;
  }

  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    for (let path in lazyTags) {
      delete lazyTags[path];
    }
    return;
  }

  for (let path in lazyTags) {
    let tag = lazyTags[path];

    update(tag, combine(getChainTagsForKey(value, path)));

    delete lazyTags[path];
  }
}

export function getChainTagsForKeys(obj: any, keys: string[]) {
  let chainTags: Tag[] = [];

  for (let i = 0; i < keys.length; i++) {
    chainTags.push(...getChainTagsForKey(obj, keys[i]));
  }

  return chainTags;
}

export function getChainTagsForKey(obj: any, path: string) {
  let chainTags: Tag[] = [];

  let current: any = obj;

  let pathLength = path.length;
  let segmentEnd = -1;
  // prevent closures
  let segment: string, descriptor: any;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let currentType = typeof current;

    if (current === null || (currentType !== 'object' && currentType !== 'function')) {
      // we've hit the end of the chain for now, break out
      break;
    }

    let lastSegmentEnd = segmentEnd + 1;
    segmentEnd = path.indexOf('.', lastSegmentEnd);

    if (segmentEnd === -1) {
      segmentEnd = pathLength;
    }

    segment = path.slice(lastSegmentEnd, segmentEnd);

    // If the segment is an @each, we can process it and then opt-
    if (segment === '@each' && segmentEnd !== pathLength) {
      assert(
        `When using @each, the value you are attempting to watch must be an array, was: ${current.toString()}`,
        Array.isArray(current) || isEmberArray(current)
      );

      lastSegmentEnd = segmentEnd + 1;
      segmentEnd = path.indexOf('.', lastSegmentEnd);

      // There shouldn't be any more segments after an `@each`, so break
      deprecate(
        `When using @each, you can only chain one property level deep, but ${path} contains a nested chain. Please create an intermediary computed property or switch to tracked properties.`,
        segmentEnd === -1,
        {
          until: '3.17.0',
          id: 'ember-metal.computed-deep-each',
        }
      );

      if (segmentEnd === -1) {
        segmentEnd = pathLength;
      }

      segment = path.slice(lastSegmentEnd, segmentEnd)!;

      if (segment.indexOf('.') !== -1) {
        segment = segment.substr(0, segment.indexOf('.'));
      }

      // Push the tags for each item's property
      let tags = (current as Array<any>).map(item => {
        assert(
          `When using @each to observe the array \`${current.toString()}\`, the items in the array must be objects`,
          typeof item === 'object'
        );

        return tagForProperty(item, segment);
      });

      // Push the tag for the array length itself
      chainTags.push(...tags, tagForProperty(current, '[]'));

      break;
    }

    // If the segment is linking to an args proxy, we need to manually access
    // the tags for the args, since they are direct references and don't have a
    // tagForProperty. We then continue chaining like normal after it, since
    // you could chain off an arg if it were an object, for instance.
    if (segment === 'args' && ARGS_PROXY_TAGS.has(current.args)) {
      assert(
        `When watching the 'args' on a GlimmerComponent, you must watch a value on the args. You cannot watch the object itself, as it never changes.`,
        segmentEnd !== pathLength
      );

      lastSegmentEnd = segmentEnd + 1;
      segmentEnd = path.indexOf('.', lastSegmentEnd);

      if (segmentEnd === -1) {
        segmentEnd = pathLength;
      }

      segment = path.slice(lastSegmentEnd, segmentEnd)!;

      let namedArgs = ARGS_PROXY_TAGS.get(current.args);
      let ref = namedArgs.get(segment);

      chainTags.push(ref.tag);

      // We still need to break if we're at the end of the path.
      if (segmentEnd === pathLength) {
        break;
      }

      // Otherwise, set the current value and then continue to the next segment
      current = ref.value();
      continue;
    }

    // TODO: Assert that current[segment] isn't an undecorated, non-MANDATORY_SETTER/dependentKeyCompat getter

    let propertyTag = tagForProperty(current, segment);
    descriptor = descriptorForProperty(current, segment);

    chainTags.push(propertyTag);

    // If the key was an alias, we should always get the next value in order to
    // bootstrap the alias. This is because aliases, unlike other CPs, should
    // always be in sync with the aliased value.
    if (descriptor !== undefined && typeof descriptor.altKey === 'string') {
      current = current[segment];

      // We still need to break if we're at the end of the path.
      if (segmentEnd === pathLength) {
        break;
      }

      // Otherwise, continue to process the next segment
      continue;
    }

    // If we're at the end of the path, processing the last segment, and it's
    // not an alias, we should _not_ get the last value, since we already have
    // its tag. There's no reason to access it and do more work.
    if (segmentEnd === pathLength) {
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
    } else {
      // If the descriptor is defined, then its a normal CP (not an alias, which
      // would have been handled earlier). We get the last revision to check if
      // the CP is still valid, and if so we use the cached value. If not, then
      // we create a lazy chain lookup, and the next time the CP is caluculated,
      // it will update that lazy chain.
      let lastRevision = getLastRevisionFor(current, segment);

      if (validate(propertyTag, lastRevision)) {
        current = peekCacheFor(current).get(segment);
      } else {
        let lazyChains = metaFor(current).writableLazyChainsFor(segment);

        let rest = path.substr(segmentEnd + 1);

        let placeholderTag = lazyChains[rest];

        if (placeholderTag === undefined) {
          placeholderTag = lazyChains[rest] = createUpdatableTag();
        }

        chainTags.push(placeholderTag);

        break;
      }
    }
  }

  return chainTags;
}
