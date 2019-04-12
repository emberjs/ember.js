import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { Factory, FactoryClass, LookupOptions, Owner } from '@ember/-internals/owner';
import { EMBER_GLIMMER_HELPER_MANAGER } from '@ember/canary-features';
import { isTemplateOnlyComponent } from '@ember/component/template-only';
import { assert, deprecate } from '@ember/debug';
import { PARTIALS } from '@ember/deprecated-features';
import EmberError from '@ember/error';
import { _instrumentStart } from '@ember/instrumentation';
import {
  ComponentDefinition,
  Helper,
  Option,
  PartialDefinition,
  RuntimeResolver,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import { PartialDefinitionImpl } from '@glimmer/opcode-compiler';
import {
  getComponentManager,
  getComponentTemplate,
  getDynamicVar,
  getHelperManager,
  getModifierManager,
  isInternalComponentManager,
  isInternalHelper,
  isInternalModifierManager,
  ModifierDefinition,
} from '@glimmer/runtime';
import { CurlyComponentDefinition } from './component-managers/curly';
import { CustomManagerDefinition } from './component-managers/custom';
import { InternalComponentDefinition } from './component-managers/internal';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import InternalComponent from './components/internal';
import {
  HelperFactory,
  HelperInstance,
  isClassicHelperManager,
  SIMPLE_CLASSIC_HELPER_MANAGER,
  SimpleHelper,
} from './helper';
import { default as componentAssertionHelper } from './helpers/-assert-implicit-component-helper-argument';
import { default as inElementNullCheckHelper } from './helpers/-in-element-null-check';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as trackArray } from './helpers/-track-array';
import { default as action } from './helpers/action';
import { default as array } from './helpers/array';
import { default as concat } from './helpers/concat';
import customHelper from './helpers/custom';
import { default as eachIn } from './helpers/each-in';
import { default as fn } from './helpers/fn';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { inlineIf, inlineUnless } from './helpers/if-unless';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import ActionModifierManager from './modifiers/action';
import { CustomModifierDefinition } from './modifiers/custom';
import OnModifierManager from './modifiers/on';
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

interface IBuiltInHelpers {
  [name: string]: Helper | undefined;
}

const BUILTINS_HELPERS: IBuiltInHelpers = {
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
  '-get-dynamic-var': getDynamicVar,
  '-mount': mountHelper,
  '-outlet': outletHelper,
  '-assert-implicit-component-helper-argument': componentAssertionHelper,
  '-in-el-null': inElementNullCheckHelper,
};

interface IBuiltInModifiers {
  [name: string]: ModifierDefinition | undefined;
}

export default class RuntimeResolverImpl implements RuntimeResolver<Owner> {
  public isInteractive: boolean;

  private handles: any[] = [
    undefined, // ensure no falsy handle
  ];
  private objToHandle = new WeakMap<any, number>();

  private builtInHelpers: IBuiltInHelpers = BUILTINS_HELPERS;

  private builtInModifiers: IBuiltInModifiers;

  private componentDefinitionCache: Map<object, ComponentDefinition | null> = new Map();

  public componentDefinitionCount = 0;
  public helperDefinitionCount = 0;

  constructor(owner: Owner, isInteractive: boolean) {
    this.isInteractive = isInteractive;

    this.builtInModifiers = {
      action: { manager: new ActionModifierManager(owner), state: null },
      on: { manager: new OnModifierManager(owner, isInteractive), state: null },
    };
  }

  /***  IRuntimeResolver ***/

  /**
   * public componentDefHandleCount = 0;
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, owner: Owner): Option<ComponentDefinition> {
    let handle = this.lookupComponentHandle(name, owner);
    if (handle === null) {
      assert(
        `Could not find component named "${name}" (no component or template with that name was found)`
      );
      return null;
    }
    return this.resolve(handle);
  }

  lookupComponentHandle(name: string, owner: Owner) {
    let nextHandle = this.handles.length;
    let handle = this.handle(this._lookupComponentDefinition(name, owner));

    assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      !(name === 'text-area' && handle === null)
    );

    if (nextHandle === handle) {
      this.componentDefinitionCount++;
    }
    return handle;
  }

  /**
   * Called by RuntimeConstants to lookup unresolved handles.
   */
  resolve<U>(handle: number): U {
    return this.handles[handle];
  }
  // End IRuntimeResolver

  /**
   * Called by CompileTimeLookup compiling Unknown or Helper OpCode
   */
  lookupHelper(name: string, owner: Owner): Option<number> {
    let nextHandle = this.handles.length;
    let helper = this._lookupHelper(name, owner);
    if (helper !== null) {
      let handle = this.handle(helper);

      if (nextHandle === handle) {
        this.helperDefinitionCount++;
      }
      return handle;
    }
    return null;
  }

  /**
   * Called by CompileTimeLookup compiling the
   */
  lookupModifier(name: string, owner: Owner): Option<number> {
    return this.handle(this._lookupModifier(name, owner));
  }

  /**
   * Called by CompileTimeLookup to lookup partial
   */
  lookupPartial(name: string, owner: Owner): Option<number> {
    if (PARTIALS) {
      let partial = this._lookupPartial(name, owner);
      return this.handle(partial);
    } else {
      return null;
    }
  }

  // TODO: This isn't necessary in all embedding environments, we should likely
  // make it optional within Glimmer-VM
  compilable(): any {}

  // end CompileTimeLookup

  // needed for lazy compile time lookup
  private handle(obj: unknown) {
    if (obj === undefined || obj === null) {
      return null;
    }
    let handle: number | undefined = this.objToHandle.get(obj);
    if (handle === undefined) {
      handle = this.handles.push(obj) - 1;
      this.objToHandle.set(obj, handle);
    }
    return handle;
  }

  private _lookupHelper(_name: string, owner: Owner): Option<Helper> {
    assert(
      `You attempted to overwrite the built-in helper "${_name}" which is not allowed. Please rename the helper.`,
      !(this.builtInHelpers[_name] && owner.hasRegistration(`helper:${_name}`))
    );

    const helper = this.builtInHelpers[_name];
    if (helper !== undefined) {
      return helper;
    }

    let name = _name;

    const factory =
      owner.factoryFor<SimpleHelper | HelperInstance, HelperFactory<SimpleHelper | HelperInstance>>(
        `helper:${name}`
      ) || owner.factoryFor(`helper:${name}`);

    if (factory === undefined || factory.class === undefined) {
      return null;
    }

    const manager = getHelperManager(owner, factory.class);

    if (manager === undefined) {
      return null;
    }

    assert(
      'helper managers have not been enabled yet, you must use classic helpers',
      EMBER_GLIMMER_HELPER_MANAGER ||
        isClassicHelperManager(manager) ||
        manager === SIMPLE_CLASSIC_HELPER_MANAGER
    );

    assert(
      `internal helpers are not supported via \`getHelperManager\` yet, found an internal manager for ${name}`,
      !isInternalHelper(manager)
    );

    // For classic class based helpers, we need to pass the factoryFor result itself rather
    // than the raw value (`factoryFor(...).class`). This is because injections are already
    // bound in the factoryFor result, including type-based injections
    return customHelper(manager, isClassicHelperManager(manager) ? factory : factory.class);
  }

  private _lookupPartial(name: string, owner: Owner): PartialDefinition {
    let templateFactory = lookupPartial(name, owner);
    let template = templateFactory(owner);

    return new PartialDefinitionImpl(name, template);
  }

  private _lookupModifier(name: string, owner: Owner) {
    let builtin = this.builtInModifiers[name];

    if (builtin === undefined) {
      let modifier = owner.factoryFor<unknown, FactoryClass>(`modifier:${name}`);
      if (modifier !== undefined) {
        let manager = getModifierManager(owner, modifier.class!);

        assert(`Expected a modifier manager to exist, but did not find one for ${name}`, manager);

        assert(
          `Internal modifier managers are not supported via \`getModifierManager\` yet, found an internal manager for ${name}`,
          !isInternalModifierManager(manager)
        );

        return new CustomModifierDefinition(name, modifier, manager, this.isInteractive);
      }
    }

    return builtin;
  }

  private _lookupComponentDefinition(_name: string, owner: Owner): Option<ComponentDefinition> {
    let name = _name;

    let pair = lookupComponentPair(owner, name);
    if (pair === null) {
      return null;
    }

    let layout: Template | undefined;
    let key: object;

    if (pair.component === null) {
      key = layout = pair.layout!(owner);
    } else {
      key = pair.component;
    }

    let cachedComponentDefinition = this.componentDefinitionCache.get(key);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    if (layout === undefined && pair.layout !== null) {
      layout = pair.layout(owner);
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);

    let definition: Option<ComponentDefinition> = null;

    if (pair.component === null) {
      if (ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
        definition = new TemplateOnlyComponentDefinition(name, layout!);
      }
    } else if (isTemplateOnlyComponent(pair.component.class)) {
      definition = new TemplateOnlyComponentDefinition(name, layout!);
    }

    if (pair.component !== null) {
      assert(`missing component class ${name}`, pair.component.class !== undefined);

      let ComponentClass = pair.component.class!;
      let manager = getComponentManager(owner, ComponentClass);

      if (manager !== undefined) {
        if (isInternalComponentManager(manager)) {
          assert(`missing layout for internal component ${name}`, pair.layout !== null);

          definition = new InternalComponentDefinition(
            manager,
            ComponentClass as typeof InternalComponent,
            layout!
          );
        } else {
          definition = new CustomManagerDefinition(
            name,
            pair.component,
            manager,
            layout !== undefined
              ? layout
              : owner.lookup<TemplateFactory>(P`template:components/-default`)!(owner)
          );
        }
      }
    }

    if (definition === null) {
      definition = new CurlyComponentDefinition(
        name,
        pair.component || owner.factoryFor(P`component:-default`),
        layout
      );
    }

    finalizer();
    this.componentDefinitionCache.set(key, definition);
    return definition;
  }
}
