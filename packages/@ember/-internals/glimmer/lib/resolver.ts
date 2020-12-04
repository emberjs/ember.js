import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { Factory, FactoryClass, LookupOptions, Owner } from '@ember/-internals/owner';
import { assert, deprecate } from '@ember/debug';
import { PARTIALS } from '@ember/deprecated-features';
import EmberError from '@ember/error';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  CompileTimeResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  Option,
  PartialDefinition,
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
import { PartialDefinitionImpl } from '@glimmer/opcode-compiler';
import {
  getDynamicVar,
  TEMPLATE_ONLY_COMPONENT_MANAGER,
  templateOnlyComponent,
} from '@glimmer/runtime';
import { _WeakSet } from '@glimmer/util';
import { CURLY_COMPONENT_MANAGER } from './component-managers/curly';
import {
  CLASSIC_HELPER_MANAGER_FACTORY,
  HelperFactory,
  HelperInstance,
  isClassicHelper,
  SimpleHelper,
} from './helper';
import { default as componentAssertionHelper } from './helpers/-assert-implicit-component-helper-argument';
import { default as inElementNullCheckHelper } from './helpers/-in-element-null-check';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as trackArray } from './helpers/-track-array';
import { default as action } from './helpers/action';
import { default as array } from './helpers/array';
import { default as concat } from './helpers/concat';
import { default as eachIn } from './helpers/each-in';
import { default as fn } from './helpers/fn';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { inlineIf, inlineUnless } from './helpers/if-unless';
import { internalHelper } from './helpers/internal-helper';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import actionModifier from './modifiers/action';
import onModifier from './modifiers/on';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function componentFor(
  name: string,
  owner: Owner,
  options?: LookupOptions
): Option<Factory<{}, {}>> {
  let fullName = `component:${name}`;
  return owner.factoryFor(fullName, options) || null;
}

function layoutFor(name: string, owner: Owner, options?: LookupOptions): Option<Template> {
  let templateFullName = `template:components/${name}`;

  return owner.lookup(templateFullName, options) || null;
}

type LookupResult =
  | {
      component: Factory<{}, {}>;
      layout: TemplateFactory;
    }
  | {
      component: Factory<{}, {}>;
      layout: null;
    }
  | {
      component: null;
      layout: TemplateFactory;
    };

function lookupComponentPair(
  owner: Owner,
  name: string,
  options?: LookupOptions
): Option<LookupResult> {
  let component = componentFor(name, owner, options);

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

let lookupPartial: { templateName: string; owner: Owner } | any;
let templateFor: { owner: Owner; underscored: string; name: string } | any;
let parseUnderscoredName: { templateName: string } | any;

if (PARTIALS) {
  lookupPartial = function (templateName: string, owner: Owner) {
    deprecate(
      `The use of \`{{partial}}\` is deprecated, please refactor the "${templateName}" partial to a component`,
      false,
      {
        id: 'ember-views.partial',
        until: '4.0.0',
        url: 'https://deprecations.emberjs.com/v3.x#toc_ember-views-partial',
        for: 'ember-source',
        since: {
          enabled: '3.15.0-beta.1',
        },
      }
    );

    if (templateName === null) {
      return;
    }

    let template = templateFor(owner, parseUnderscoredName(templateName), templateName);

    assert(`Unable to find partial with name "${templateName}"`, Boolean(template));

    return template;
  };

  templateFor = function (owner: any, underscored: string, name: string) {
    if (PARTIALS) {
      if (!name) {
        return;
      }
      assert(`templateNames are not allowed to contain periods: ${name}`, name.indexOf('.') === -1);

      if (!owner) {
        throw new EmberError(
          'Container was not found when looking up a views template. ' +
            'This is most likely due to manually instantiating an Ember.View. ' +
            'See: http://git.io/EKPpnA'
        );
      }

      return owner.lookup(`template:${underscored}`) || owner.lookup(`template:${name}`);
    }
  };

  parseUnderscoredName = function (templateName: string) {
    let nameParts = templateName.split('/');
    let lastPart = nameParts[nameParts.length - 1];

    nameParts[nameParts.length - 1] = `_${lastPart}`;

    return nameParts.join('/');
  };
}

const BUILTINS_HELPERS = {
  if: inlineIf,
  action,
  array,
  concat,
  fn,
  get,
  hash,
  log,
  mut,
  'query-params': queryParams,
  readonly,
  unbound,
  unless: inlineUnless,
  '-hash': hash,
  '-each-in': eachIn,
  '-normalize-class': normalizeClassHelper,
  '-track-array': trackArray,
  '-get-dynamic-var': internalHelper(getDynamicVar),
  '-mount': mountHelper,
  '-outlet': outletHelper,
  '-assert-implicit-component-helper-argument': componentAssertionHelper,
  '-in-el-null': inElementNullCheckHelper,
};

const BUILTINS_MODIFIERS = {
  action: actionModifier,
  on: onModifier,
};

const CLASSIC_HELPER_MANAGER_ASSOCIATED = new _WeakSet();

export default class ResolverImpl implements RuntimeResolver<Owner>, CompileTimeResolver<Owner> {
  private componentDefinitionCache: Map<object, ResolvedComponentDefinition | null> = new Map();

  lookupPartial(name: string, owner: Owner): Option<PartialDefinition> {
    if (PARTIALS) {
      let templateFactory = lookupPartial(name, owner);
      let template = templateFactory(owner);

      return new PartialDefinitionImpl(name, template);
    } else {
      return null;
    }
  }

  lookupHelper(name: string, owner: Owner): Option<HelperDefinitionState> {
    assert(
      `You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`,
      !(BUILTINS_HELPERS[name] && owner.hasRegistration(`helper:${name}`))
    );

    const helper = BUILTINS_HELPERS[name];
    if (helper !== undefined) {
      return helper;
    }

    const factory = owner.factoryFor<
      SimpleHelper | HelperInstance,
      HelperFactory<SimpleHelper | HelperInstance>
    >(`helper:${name}`);

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
          setInternalHelperManager(CLASSIC_HELPER_MANAGER_FACTORY, factory);
        }
      } else {
        setInternalHelperManager(CLASSIC_HELPER_MANAGER_FACTORY, factory);
      }

      return factory;
    }

    return definition;
  }

  lookupModifier(name: string, owner: Owner): Option<ModifierDefinitionState> {
    let builtin = BUILTINS_MODIFIERS[name];

    if (builtin !== undefined) {
      return builtin;
    }

    let modifier = owner.factoryFor<unknown, FactoryClass>(`modifier:${name}`);

    if (modifier === undefined) {
      return null;
    }

    return modifier.class || null;
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
      key = template = pair.layout!(owner);
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
        definition = {
          state: owner.factoryFor(P`component:-default`)!,
          manager: CURLY_COMPONENT_MANAGER,
          template,
        };
      }
    } else {
      assert(`missing component class ${name}`, pair.component.class !== undefined);

      let factory = pair.component;
      let ComponentClass = factory.class!;
      let manager = getInternalComponentManager(owner, ComponentClass);

      definition = {
        state: manager === CURLY_COMPONENT_MANAGER ? factory : ComponentClass,
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
