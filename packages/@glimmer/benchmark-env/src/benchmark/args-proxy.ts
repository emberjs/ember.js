import { CapturedNamedArguments, CapturedArguments } from '@glimmer/interfaces';
import { ComponentArgs } from '../interfaces';

class ArgsProxy implements ProxyHandler<CapturedNamedArguments> {
  isExtensible() {
    return false;
  }

  ownKeys(target: CapturedNamedArguments): string[] {
    return target.names;
  }

  getOwnPropertyDescriptor(
    target: CapturedNamedArguments,
    p: PropertyKey
  ): PropertyDescriptor | undefined {
    let desc: PropertyDescriptor | undefined;
    if (typeof p === 'string' && target.has(p)) {
      const value = target.get(p).value();
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
    return typeof p === 'string' ? target.has(p) : false;
  }

  get(target: CapturedNamedArguments, p: PropertyKey): any {
    if (typeof p === 'string' && target.has(p)) {
      return target.get(p).value();
    }
  }

  set() {
    return false;
  }
}

export default function argsProxy(args: CapturedArguments): ComponentArgs {
  return new Proxy(args.named, new ArgsProxy());
}
