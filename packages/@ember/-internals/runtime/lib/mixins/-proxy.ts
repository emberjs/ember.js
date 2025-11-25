/**
@module ember
*/

import { ENV } from '@ember/-internals/environment';
import { meta } from '@ember/-internals/meta';
import Mixin from '@ember/object/mixin';
import {
  get,
  set,
  defineProperty,
  tagForObject,
  tagForProperty,
} from '@ember/-internals/metal';
import { setProxy, setupMandatorySetter, isObject, isProxy } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { setCustomTagFor } from '@glimmer/manager';
import type { UpdatableTag, Tag } from '@glimmer/validator';
import { combine, updateTag, tagFor, tagMetaFor } from '@glimmer/validator';

export function contentFor<T>(proxy: ProxyMixin<T>): T | null {
  let content = get(proxy, 'content');
  updateTag(tagForObject(proxy) as UpdatableTag, tagForObject(content));
  return content;
}

function customTagForProxy(proxy: object, key: string, addMandatorySetter?: boolean): Tag {
  assert('Expected a proxy', isProxy(proxy));

  let meta = tagMetaFor(proxy);
  let tag = tagFor(proxy, key, meta);

  if (DEBUG) {
    (tag as any)._propertyKey = key;
  }

  if (key in proxy) {
    if (DEBUG && addMandatorySetter) {
      assert('[BUG] setupMandatorySetter should be set when debugging', setupMandatorySetter);
      setupMandatorySetter(tag, proxy, key);
    }

    return tag;
  } else {
    let tags: Tag[] = [tag, tagFor(proxy, 'content', meta)];

    let content = contentFor(proxy);

    if (isObject(content)) {
      tags.push(tagForProperty(content, key, addMandatorySetter));
    }

    return combine(tags);
  }
}

interface ProxyMixin<T = unknown> {
  content: T | null;

  willDestroy(): void;

  isTruthy: boolean;

  unknownProperty<K extends keyof T>(key: K): T[K] | undefined;
  unknownProperty(key: string): unknown;

  setUnknownProperty<K extends keyof T>(key: K, value: T[K]): T[K];
  setUnknownProperty<V>(key: string, value: V): V;
}

const ProxyMixin = Mixin.create({
  content: null,

  init() {
    this._super(...arguments);
    setProxy(this);
    tagForObject(this);
    setCustomTagFor(this, customTagForProxy);
  },

  willDestroy() {
    this.set('content', null);
    this._super(...arguments);
  },

  // FIXED: Classic method instead of ES6 getter
  isTruthy() {
    return Boolean(get(this, 'content'));
  },

  unknownProperty(key: string) {
    let content = contentFor(this);
    return content ? get(content, key) : undefined;
  },

  setUnknownProperty(key: string, value: unknown) {
    let m = meta(this);

    if (m.isInitializing() || m.isPrototypeMeta(this)) {
      defineProperty(this, key, null, value);
      return value;
    }

    let content = contentFor(this);

    assert(
      `Cannot delegate set('${key}', ${value}) to the 'content' property of object proxy ${this}: its 'content' is undefined.`,
      content
    );

    return set(content as object, key, value);
  },
});

export default ProxyMixin;
