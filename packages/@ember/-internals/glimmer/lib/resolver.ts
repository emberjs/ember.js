import type { InternalFactory, InternalOwner } from '@ember/-internals/owner';
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
import { getComponentTemplate } from '@glimmer/manager/lib/public/template';
import {
  getInternalComponentManager,
  getInternalHelperManager,
  setInternalHelperManager,
} from '@glimmer/manager/lib/internal/api';
import {
  templateOnlyComponent,
  TEMPLATE_ONLY_COMPONENT_MANAGER,
} from '@glimmer/runtime/lib/component/template-only';
import { isCurlyManager } from './component-managers/curly-brand';
import { isClassicHelper } from './helper-brand';
import { BUILTIN_HELPERS, BUILTIN_MODIFIERS } from './builtins-registry';

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

function lookupComponentPair(owner: InternalOwner, name: string): Nullable<LookupResult> {
  let component = componentFor(name, owner);

  if (isFactory(component) && component.class) {
    let layout = getComponentTemplate(component.class);

    if (layout !== undefined) {
      return { component, layout };
    }
  }

  if (component === null) {
    return null;
  } else {
    return { component, layout: null } as LookupResult;
  }
}

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

      // The classic helper manager is registered on the classic `Helper` base
      // class; deriving it from the definition (rather than importing it from
      // the module that defines `Helper`) keeps this module from pulling in
      // the classic object model when no classic helpers are in use.
      let manager = getInternalHelperManager(definition);

      if (DEBUG) {
        // In DEBUG we need to only set the associated value once, otherwise
        // we'll trigger an assertion
        if (!CLASSIC_HELPER_MANAGER_ASSOCIATED.has(factory)) {
          CLASSIC_HELPER_MANAGER_ASSOCIATED.add(factory);
          setInternalHelperManager(manager, factory);
        }
      } else {
        setInternalHelperManager(manager, factory);
      }

      return factory;
    }

    return definition;
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
