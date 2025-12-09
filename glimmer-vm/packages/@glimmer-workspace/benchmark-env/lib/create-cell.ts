import type { TagMeta, UpdatableTag } from '@glimmer/validator';
import { consumeTag, dirtyTagFor, tagFor, tagMetaFor } from '@glimmer/validator';

import type { Cell } from './interfaces';

class CellImpl<T> implements Cell<T> {
  private _meta: TagMeta;
  private _obj: object;
  private _key: string;
  private _tag: UpdatableTag;
  private _value: T;

  constructor(obj: object, key: string, initialValue: T) {
    const meta = tagMetaFor(obj);
    this._meta = meta;
    this._obj = obj;
    this._key = key;
    this._tag = tagFor(obj, key, meta) as UpdatableTag;
    this._value = initialValue;
  }

  get(): T {
    consumeTag(this._tag);
    return this._value;
  }

  set(value: T) {
    dirtyTagFor(this._obj, this._key, this._meta);
    this._value = value;
  }
}

export default function createCell<T>(obj: object, key: string, initialValue: T): Cell<T> {
  return new CellImpl(obj, key, initialValue);
}
