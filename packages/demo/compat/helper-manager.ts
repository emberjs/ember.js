// Custom helper manager for gxt compatibility

export class CustomHelperManager {
  capabilities: number;
  delegate: any;

  constructor(delegate: any) {
    this.delegate = delegate;
    this.capabilities = 0;
  }

  getHelper(helper: any) {
    return (args: any[], owner: any) => {
      const instance = this.delegate.createHelper(helper, {
        positional: args,
        named: {},
      });
      return this.delegate.getValue(instance);
    };
  }

  create(owner: any, helper: any, args: any) {
    return this.delegate.createHelper(helper, args);
  }

  getDebugName(helper: any) {
    return this.delegate.getDebugName?.(helper) || 'Helper';
  }

  getValue(instance: any) {
    return this.delegate.getValue(instance);
  }

  getDestroyable(instance: any) {
    return this.delegate.getDestroyable?.(instance) || null;
  }
}
