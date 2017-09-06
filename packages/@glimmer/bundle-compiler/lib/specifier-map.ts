import { Opaque } from "@glimmer/util";

import { Specifier } from "./specifiers";

/**
 * Maps a specifier to its associated handle, or unique integer ID. Host
 * environments can use the specifier map provided at the end of compilation to
 * build a data structure for converting handles into actual module values.
 */
export class SpecifierMap {
  public bySpecifier = new LookupMap<Specifier, number>();
  public byHandle = new LookupMap<number, Specifier>();

  public byVMHandle = new LookupMap<number, Specifier>();
  public vmHandleBySpecifier = new LookupMap<Specifier, number>();
}

export interface Mapping {
  get(key: Opaque): Opaque;
  set(key: Opaque, value: Opaque): void;
  forEach(cb: (value: Opaque, key: Opaque) => void): void;
}

export class LookupMap<K, V> implements Mapping {
  private pairs: Opaque[];
  size = 0;
  constructor() {
    this.pairs = [];
  }

  set(key: K, value: V) {
    let idx = this.pairs.indexOf(key);
    if (idx === -1) {
      this.pairs.push(key, value);
      this.size++;
    } else {
      this.pairs[idx + 1] = value;
    }
  }

  get(key: K): V | undefined {
    let idx = this.pairs.indexOf(key);
    if (idx > -1) {
      return this.pairs[idx + 1] as V;
    }

    return undefined;
  }

  forEach(cb: (value: V, key: K) => void) {
    for (let i = 0; i < this.pairs.length; i += 2) {
      let value = this.pairs[i + 1];
      let key = this.pairs[i];
      cb(value as V, key as K);
    }
  }
}
