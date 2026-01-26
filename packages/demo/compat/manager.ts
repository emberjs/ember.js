import { $_MANAGERS, $PROPS_SYMBOL, formula } from '@lifeart/gxt';

import { CustomHelperManager } from './helper-manager';

globalThis.EmberFunctionalHelpers = new Set();
globalThis.COMPONENT_TEMPLATES = globalThis.COMPONENT_TEMPLATES || new WeakMap();
globalThis.COMPONENT_MANAGERS = globalThis.COMPONENT_MANAGERS || new WeakMap();
globalThis.INTERNAL_MANAGERS = globalThis.INTERNAL_MANAGERS || new WeakMap();
globalThis.INTERNAL_HELPER_MANAGERS = globalThis.INTERNAL_HELPER_MANAGERS || new WeakMap();
globalThis.INTERNAL_MODIFIER_MANAGERS = globalThis.INTERNAL_MODIFIER_MANAGERS || new WeakMap();

$_MANAGERS.component.canHandle = function (komp) {
  if (globalThis.INTERNAL_MANAGERS.has(komp)) {
    return true;
  } else if (globalThis.COMPONENT_MANAGERS.has(komp)) {
    return true;
  }
  // Classic Ember components have a create method
  if (komp.create && typeof komp.create === 'function') {
    return true;
  }
  return false;
};
$_MANAGERS.helper.canHandle = function (helper: unknown) {
  if (typeof helper === 'string') {
    return true;
  }
  return false;
};
$_MANAGERS.helper.handle = function (helper: any, params: any, hash: any) {
  if (typeof helper === 'string') {
    const argScope = hash['$_scope']?.() || null;
    if (!argScope) {
      const owner = globalThis.owner;
      const maybeHelper = owner.lookup(`helper:${helper}`);
      const manager = getInternalHelperManager(maybeHelper);
      if (manager) {
        return manager.getHelper(maybeHelper)(params, owner);
      }
      // Helper not found - this may happen during initialization
      console.warn(`Helper "${helper}" not found or has no manager`);
    }
  }
};

function argsForInternalManager(args, fw) {
  const named = {};
  Object.keys(args).forEach((arg) => {
    named[arg] = formula(() => args[arg], 'argsForInternalManager');
  });

  return {
    capture() {
      return {
        positional: [],
        named, // args
      };
    },
  };
}

$_MANAGERS.component.handle = function (komp, args, fw, ctx) {
  const manager = globalThis.INTERNAL_MANAGERS.get(komp) || globalThis.COMPONENT_MANAGERS.get(komp);
  // debugger;

  const instance = manager.create(
    globalThis.owner,
    komp,
    argsForInternalManager(args, fw),
    {},
    {},
    formula(() => ctx, 'internalManager:caller')
  );
  const tpl =
    getComponentTemplate(instance) ||
    getComponentTemplate(instance.prototype) ||
    getComponentTemplate(komp);
  // debugger;

  return () => {
    args[$PROPS_SYMBOL] = fw || [[], [], []];
    return tpl.bind(instance)(args);
  };
};
// console.log('$_MANAGERS', $_MANAGERS);

export function capabilityFlagsFrom(capabilities: Record<string, boolean>) {
  // Convert capability object to flags
  // Each capability is a boolean that can be checked
  let flags = 0;
  const capabilityNames = [
    'dynamicLayout',
    'dynamicTag',
    'prepareArgs',
    'createArgs',
    'attributeHook',
    'elementHook',
    'createCaller',
    'dynamicScope',
    'updateHook',
    'createInstance',
    'wrapped',
    'willDestroy',
    'hasSubOwner',
  ];
  capabilityNames.forEach((name, index) => {
    if (capabilities[name]) {
      flags |= 1 << index;
    }
  });
  return flags;
}

export function setInternalComponentManager(manager: any, handle: any) {
  globalThis.INTERNAL_MANAGERS.set(handle, manager);
  return handle;
}

export function getInternalHelperManager(helper: any) {
  return (
    globalThis.INTERNAL_HELPER_MANAGERS.get(helper) ||
    globalThis.INTERNAL_HELPER_MANAGERS.get(Object.getPrototypeOf(helper))
  );
}
export function helperCapabilities(v: string, value: any) {
  return value;
}
export function modifierCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  return capabilities || {};
}

export function componentCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  return capabilities || {};
}
export function setHelperManager(factory: any, helper: any) {
  return setInternalHelperManager(new CustomHelperManager(factory), helper);
  // console.log('setHelperManager', ...arguments);
  // debugger;
  // globalThis.HELPER_MANAGERS.set(helper, manager);
  // return helper;
}
export function getHelperManager(helper: any) {
  return getInternalHelperManager(helper);
}
export function getInternalComponentManager(handle: any) {
  return globalThis.INTERNAL_MANAGERS.get(handle);
}
export function getComponentTemplate(comp: any) {
  return globalThis.COMPONENT_TEMPLATES.get(comp);
}
export function setComponentTemplate(tpl: any, comp: any) {
  globalThis.COMPONENT_TEMPLATES.set(comp, tpl);
  return comp;
}
export function setInternalModifierManager(manager: any, modifier: any) {
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, manager);
  return modifier;
}

export function setComponentManager(manager: any, component: any) {
  return globalThis.COMPONENT_MANAGERS.set(component, manager);
}

export function getComponentManager(component: any) {
  return globalThis.COMPONENT_MANAGERS.get(component);
}

export function setModifierManager(factory: any, modifier: any) {
  // Create a manager from the factory and store it
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, factory);
  return modifier;
}

const CUSTOM_TAG_FOR = new WeakMap<object, (obj: object, key: string) => any>();

export function getCustomTagFor(obj: any) {
  return CUSTOM_TAG_FOR.get(obj);
}

export function setCustomTagFor(obj: any, tagFn: (obj: object, key: string) => any) {
  CUSTOM_TAG_FOR.set(obj, tagFn);
}

export function setInternalHelperManager(manager: any, helper: any) {
  globalThis.INTERNAL_HELPER_MANAGERS.set(helper, manager);
  return helper;
}

export function hasInternalHelperManager(helper: any) {
  return globalThis.INTERNAL_HELPER_MANAGERS.has(helper);
}

export function hasCapability(
  capabilities: number,
  capability: number
): boolean {
  return (capabilities & capability) !== 0;
}

export function getInternalModifierManager(modifier: any) {
  return globalThis.INTERNAL_MODIFIER_MANAGERS.get(modifier);
}

export function managerHasCapability(
  manager: { capabilities: number },
  capability: number
): boolean {
  return hasCapability(manager.capabilities, capability);
}

export function hasInternalComponentManager(component: any): boolean {
  return globalThis.INTERNAL_MANAGERS.has(component);
}

export function hasValue(capabilities: Record<string, boolean>): boolean {
  return Boolean(capabilities?.hasValue);
}

export function hasDestroyable(capabilities: Record<string, boolean>): boolean {
  return Boolean(capabilities?.willDestroy);
}
