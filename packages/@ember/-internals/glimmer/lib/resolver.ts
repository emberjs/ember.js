import type { InternalFactory, InternalOwner, RegisterOptions } from '@ember/-internals/owner';
import { isFactory } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import type {
  ClassicResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  ResolvedComponentDefinition,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
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
import { isCurlyManager } from './component-managers/curly';
import { CLASSIC_HELPER_MANAGER, isClassicHelper } from './helper';
import { default as disallowDynamicResolution } from './helpers/-disallow-dynamic-resolution';
import { default as inElementNullCheckHelper } from './helpers/-in-element-null-check';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as resolve } from './helpers/-resolve';
import { default as trackArray } from './helpers/-track-array';
import { default as eachIn } from './helpers/each-in';
import { default as mut } from './helpers/mut';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import { default as uniqueId } from './helpers/unique-id';

import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function componentFor(
  name: string,
  owner: InternalOwner
): Nullable<InternalFactory<object> | object> {
  let fullName = `component:${name}` as const;
  return owner.factoryFor(fullName) || null;
}

function layoutFor(
  name: string,
  owner: InternalOwner,
  options?: RegisterOptions
): Nullable<Template> {
  if (DEPRECATIONS.DEPRECATE_COMPONENT_TEMPLATE_RESOLVING.isRemoved) {
    return null;
  }

  let templateFullName = `template:components/${name}` as const;

  let result = (owner.lookup(templateFullName, options) as Template) || null;

  if (result) {
    deprecateUntil(
      `Components with separately resolved templates are deprecated. Migrate to either co-located js/ts + hbs files or to gjs/gts. Tried to lookup '${templateFullName}'.`,
      DEPRECATIONS.DEPRECATE_COMPONENT_TEMPLATE_RESOLVING
    );
  }

  return result;
}

type LookupResult =
  | {
      component: InternalFactory<object>;
      layout: TemplateFactory;
    }
  | {
      component: InternalFactory<object>;
      layout: null;
    }
  | {
      component: null;
      layout: TemplateFactory;
    };

function lookupComponentPair(
  owner: InternalOwner,
  name: string,
  options?: RegisterOptions
): Nullable<LookupResult> {
  let component = componentFor(name, owner);

  if (isFactory(component) && component.class) {
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

const BUILTIN_KEYWORD_HELPERS: Record<string, object> = {
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

const BUILTIN_HELPERS: Record<string, object> = {
  ...BUILTIN_KEYWORD_HELPERS,
  array,
  concat,
  fn,
  get,
  hash,
  'unique-id': uniqueId,
};

if (DEBUG) {
  BUILTIN_HELPERS['-disallow-dynamic-resolution'] = disallowDynamicResolution;
} else {
  // Bug: this may be a quirk of our test setup?
  // In prod builds, this is a no-op helper and is unused in practice. We shouldn't need
  // to add it at all, but the current test build doesn't produce a "prod compiler", so
  // we ended up running the debug-build for the template compliler in prod tests. Once
  // that is fixed, this can be removed. For now, this allows the test to work and does
  // not really harm anything, since it's just a no-op pass-through helper and the bytes
  // has to be included anyway. In the future, perhaps we can avoid the latter by using
  // `import(...)`?
  BUILTIN_HELPERS['-disallow-dynamic-resolution'] = disallowDynamicResolution;
}

// With the implementation of RFC #1006(https://rfcs.emberjs.com/id/1006-deprecate-action-template-helper), the `action` modifer was removed. It was the
// only built-in keyword modifier, so this object is currently empty.
const BUILTIN_KEYWORD_MODIFIERS: Record<string, ModifierDefinitionState> = {};

const BUILTIN_MODIFIERS: Record<string, object> = {
  ...BUILTIN_KEYWORD_MODIFIERS,
  on,
};

const CLASSIC_HELPER_MANAGER_ASSOCIATED = new WeakSet();

export default class ResolverImpl implements ClassicResolver<InternalOwner> {
  private componentDefinitionCache: Map<object, ResolvedComponentDefinition | null> = new Map();

  lookupPartial(): null {
    return null;
  }

  lookupHelper(name: string, owner: InternalOwner): Nullable<HelperDefinitionState> {
    assert(
      `You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`,
      !(BUILTIN_HELPERS[name] && owner.hasRegistration(`helper:${name}`))
    );

    let helper = BUILTIN_HELPERS[name];
    if (helper !== undefined) {
      return helper;
    }

    let factory = owner.factoryFor(`helper:${name}`);

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

  lookupModifier(name: string, owner: InternalOwner): Nullable<ModifierDefinitionState> {
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

  lookupBuiltInModifier<K extends keyof typeof BUILTIN_KEYWORD_MODIFIERS>(
    name: K
  ): (typeof BUILTIN_KEYWORD_MODIFIERS)[K];
  lookupBuiltInModifier(name: string): null;
  lookupBuiltInModifier(name: string): ModifierDefinitionState | null {
    return BUILTIN_KEYWORD_MODIFIERS[name] ?? null;
  }

  lookupComponent(name: string, owner: InternalOwner): ResolvedComponentDefinition | null {
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

    let definition: Nullable<ResolvedComponentDefinition> = null;

    if (pair.component === null) {
      definition = {
        state: templateOnlyComponent(undefined, name),
        manager: TEMPLATE_ONLY_COMPONENT_MANAGER,
        template,
      };
    } else {
      let factory = pair.component;
      assert(`missing component class ${name}`, factory.class !== undefined);
      let ComponentClass = factory.class;
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
