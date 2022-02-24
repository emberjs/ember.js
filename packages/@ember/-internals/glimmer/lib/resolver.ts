import { privatize as P } from '@ember/-internals/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { ENV } from '@ember/-internals/environment';
import { Factory, Owner } from '@ember/-internals/owner';
import { EMBER_UNIQUE_ID_HELPER } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  CompileTimeResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  Option,
  ResolvedComponentDefinition,
  RuntimeResolver,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import {
  getComponentTemplate,
  getInternalComponentManager,
  setInternalHelperManager,
} from '@glimmer/manager';
import {
  array,
  concat,
  fn,
  get,
  hash,
  on,
  templateOnlyComponent,
  TEMPLATE_ONLY_COMPONENT_MANAGER,
} from '@glimmer/runtime';
import { _WeakSet } from '@glimmer/util';
import { isCurlyManager } from './component-managers/curly';
import {
  CLASSIC_HELPER_MANAGER,
  HelperFactory,
  HelperInstance,
  isClassicHelper,
  SimpleHelper,
} from './helper';
import { default as disallowDynamicResolution } from './helpers/-disallow-dynamic-resolution';
import { default as inElementNullCheckHelper } from './helpers/-in-element-null-check';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as resolve } from './helpers/-resolve';
import { default as trackArray } from './helpers/-track-array';
import { default as action } from './helpers/action';
import { default as eachIn } from './helpers/each-in';
import { default as mut } from './helpers/mut';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import { default as uniqueId } from './helpers/unique-id';

import actionModifier from './modifiers/action';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function componentFor(name: string, owner: Owner): Option<Factory<unknown>> {
  let fullName = `component:${name}`;
  return owner.factoryFor(fullName) || null;
}

function layoutFor(name: string, owner: Owner, options?: TypeOptions): Option<Template> {
  let templateFullName = `template:components/${name}`;

  return (owner.lookup(templateFullName, options) as Template) || null;
}

type LookupResult =
  | {
      component: Factory<unknown>;
      layout: TemplateFactory;
    }
  | {
      component: Factory<unknown>;
      layout: null;
    }
  | {
      component: null;
      layout: TemplateFactory;
    };

function lookupComponentPair(
  owner: Owner,
  name: string,
  options?: TypeOptions
): Option<LookupResult> {
  let component = componentFor(name, owner);

  if (component !== null && component.class !== undefined) {
    let layout = getComponentTemplate(component.class);

    if (layout !== undefined) {
      return { component, layout };
    }
  }

  let layout = layoutFor(name, owner, options);

  if (component === null && layout === null) {
    return null;
  } else {
    return { component, layout } as LookupResult;
  }
}

const BUILTIN_KEYWORD_HELPERS = {
  action,
  mut,
  readonly,
  unbound,
  '-hash': hash,
  '-each-in': eachIn,
  '-normalize-class': normalizeClassHelper,
  '-resolve': resolve,
  '-track-array': trackArray,
  '-mount': mountHelper,
  '-outlet': outletHelper,
  '-in-el-null': inElementNullCheckHelper,
};

if (DEBUG) {
  BUILTIN_KEYWORD_HELPERS['-disallow-dynamic-resolution'] = disallowDynamicResolution;
} else {
  // Bug: this may be a quirk of our test setup?
  // In prod builds, this is a no-op helper and is unused in practice. We shouldn't need
  // to add it at all, but the current test build doesn't produce a "prod compiler", so
  // we ended up running the debug-build for the template compliler in prod tests. Once
  // that is fixed, this can be removed. For now, this allows the test to work and does
  // not really harm anything, since it's just a no-op pass-through helper and the bytes
  // has to be included anyway. In the future, perhaps we can avoid the latter by using
  // `import(...)`?
  BUILTIN_KEYWORD_HELPERS['-disallow-dynamic-resolution'] = disallowDynamicResolution;
}

const BUILTIN_HELPERS = {
  ...BUILTIN_KEYWORD_HELPERS,
  array,
  concat,
  fn,
  get,
  hash,
};

if (EMBER_UNIQUE_ID_HELPER) {
  BUILTIN_HELPERS['unique-id'] = uniqueId;
}

const BUILTIN_KEYWORD_MODIFIERS = {
  action: actionModifier,
};

const BUILTIN_MODIFIERS = {
  ...BUILTIN_KEYWORD_MODIFIERS,
  on,
};

const CLASSIC_HELPER_MANAGER_ASSOCIATED = new _WeakSet();

export default class ResolverImpl implements RuntimeResolver<Owner>, CompileTimeResolver<Owner> {
  private componentDefinitionCache: Map<object, ResolvedComponentDefinition | null> = new Map();

  lookupPartial(): null {
    return null;
  }

  lookupHelper(name: string, owner: Owner): Option<HelperDefinitionState> {
    assert(
      `You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`,
      !(BUILTIN_HELPERS[name] && owner.hasRegistration(`helper:${name}`))
    );

    const helper = BUILTIN_HELPERS[name];
    if (helper !== undefined) {
      return helper;
    }

    const factory = owner.factoryFor(`helper:${name}`) as
      | Factory<
          SimpleHelper<unknown, unknown[], Record<string, unknown>>,
          HelperFactory<SimpleHelper<unknown, unknown[], Record<string, unknown>>>
        >
      | Factory<HelperInstance, HelperFactory<HelperInstance>>;

    if (factory === undefined) {
      return null;
    }

    let definition = factory.class;

    if (definition === undefined) {
      return null;
    }

    if (typeof definition === 'function' && isClassicHelper(definition)) {
      // For classic class based helpers, we need to pass the factoryFor result itself rather
      // than the raw value (`factoryFor(...).class`). This is because injections are already
      // bound in the factoryFor result, including type-based injections

      if (DEBUG) {
        // In DEBUG we need to only set the associated value once, otherwise
        // we'll trigger an assertion
        if (!CLASSIC_HELPER_MANAGER_ASSOCIATED.has(factory)) {
          CLASSIC_HELPER_MANAGER_ASSOCIATED.add(factory);
          setInternalHelperManager(CLASSIC_HELPER_MANAGER, factory);
        }
      } else {
        setInternalHelperManager(CLASSIC_HELPER_MANAGER, factory);
      }

      return factory;
    }

    return definition;
  }

  lookupBuiltInHelper(name: string): HelperDefinitionState | null {
    return BUILTIN_KEYWORD_HELPERS[name] ?? null;
  }

  lookupModifier(name: string, owner: Owner): Option<ModifierDefinitionState> {
    let builtin = BUILTIN_MODIFIERS[name];

    if (builtin !== undefined) {
      return builtin;
    }

    let modifier = owner.factoryFor(`modifier:${name}`);

    if (modifier === undefined) {
      return null;
    }

    return modifier.class || null;
  }

  lookupBuiltInModifier(name: string): ModifierDefinitionState | null {
    return BUILTIN_KEYWORD_MODIFIERS[name] ?? null;
  }

  lookupComponent(name: string, owner: Owner): ResolvedComponentDefinition | null {
    let pair = lookupComponentPair(owner, name);

    if (pair === null) {
      assert(
        'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
        name !== 'text-area'
      );
      return null;
    }

    let template: Template | null = null;
    let key: object;

    if (pair.component === null) {
      key = template = pair.layout(owner);
    } else {
      key = pair.component;
    }

    let cachedComponentDefinition = this.componentDefinitionCache.get(key);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    if (template === null && pair.layout !== null) {
      template = pair.layout(owner);
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);

    let definition: Option<ResolvedComponentDefinition> = null;

    if (pair.component === null) {
      if (ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
        definition = {
          state: templateOnlyComponent(undefined, name),
          manager: TEMPLATE_ONLY_COMPONENT_MANAGER,
          template,
        };
      } else {
        let factory = owner.factoryFor(P`component:-default`)!;
        let manager = getInternalComponentManager(factory.class as object);

        definition = {
          state: factory,
          manager,
          template,
        };
      }
    } else {
      assert(`missing component class ${name}`, pair.component.class !== undefined);

      let factory = pair.component;
      let ComponentClass = factory.class!;
      let manager = getInternalComponentManager(ComponentClass);

      definition = {
        state: isCurlyManager(manager) ? factory : ComponentClass,
        manager,
        template,
      };
    }

    finalizer();
    this.componentDefinitionCache.set(key, definition);

    assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      !(definition === null && name === 'text-area')
    );

    return definition;
  }
}
