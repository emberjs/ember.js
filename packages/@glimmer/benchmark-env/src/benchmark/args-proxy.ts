import { CapturedNamedArguments, CapturedArguments } from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';
import { ComponentArgs } from '../interfaces';

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
      const value = valueForRef(target[p]);
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

  get(target: CapturedNamedArguments, p: PropertyKey): any {
    if (typeof p === 'string' && p in target) {
      return valueForRef(target[p]);
    }
  }

  set() {
    return false;
  }
}

export default function argsProxy(args: CapturedArguments): ComponentArgs {
  return new Proxy(args.named, new ArgsProxy());
}
