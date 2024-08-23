function argsProxyFor(capturedArgs: any, type: string) {
  return new Proxy(capturedArgs, {
    get(target, prop) {
      if (prop === 'named') {
        return {};
      } else if (prop === 'positional') {
        return target;
      } else {
        throw new Error(`Cannot get ${prop} from ${type} args`);
      }
    },
  });
}

export class CustomHelperManager {
  factory: (owner: unknown) => any;
  constructor(factory: (owner: unknown) => any) {
    this.factory = factory;
  }
  private helperManagerDelegates = new WeakMap<O, any>();
  private undefinedDelegate: any | null = null;

  private getDelegateForOwner(owner: any) {
    let delegate = this.helperManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      this.helperManagerDelegates.set(owner, delegate);
    }

    return delegate;
  }

  getDelegateFor(owner: any | undefined) {
    if (owner === undefined) {
      let { undefinedDelegate } = this;

      if (undefinedDelegate === null) {
        let { factory } = this;
        this.undefinedDelegate = undefinedDelegate = factory(undefined);
      }

      return undefinedDelegate;
    } else {
      return this.getDelegateForOwner(owner);
    }
  }

  getHelper(definition: any): any {
    return (capturedArgs, owner) => {
      let manager = this.getDelegateFor(owner as any | undefined);

      const args = argsProxyFor(capturedArgs, 'helper');
      const bucket = manager.createHelper(definition, args);

      return () => {
        return manager.getValue(bucket);
      };
    };
  }
}
