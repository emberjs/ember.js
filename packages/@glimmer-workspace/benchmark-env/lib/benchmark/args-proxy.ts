import type { CapturedArguments, CapturedNamedArguments, Reference } from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';

import type { ComponentArgs } from '../interfaces';

class ArgsProxy implements ProxyHandler<CapturedNamedArguments> {
  isExtensible() {
    return false;
  }

  ownKeys(target: CapturedNamedArguments): string[] {
    return Object.keys(target);
  }

  getOwnPropertyDescriptor(
    target: CapturedNamedArguments,
    p: PropertyKey
  ): PropertyDescriptor | undefined {
    let desc: PropertyDescriptor | undefined;
    if (typeof p === 'string' && p in target) {
      const value = valueForRef(target[p] as Reference);
      desc = {
        enumerable: true,
        configurable: false,
        writable: false,
        value,
      };
    }
    return desc;
  }

  has(target: CapturedNamedArguments, p: PropertyKey): boolean {
    return typeof p === 'string' ? p in target : false;
  }

  get(target: CapturedNamedArguments, p: PropertyKey): unknown {
    if (typeof p === 'string' && p in target) {
      return valueForRef(target[p] as Reference);
    }
  }

  set() {
    return false;
  }
}

export default function argsProxy(args: CapturedArguments): ComponentArgs {
  return new Proxy(args.named, new ArgsProxy());
}
