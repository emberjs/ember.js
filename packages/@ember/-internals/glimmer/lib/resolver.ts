import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { Factory, FactoryClass, LookupOptions, Owner } from '@ember/-internals/owner';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import {
  EMBER_GLIMMER_HELPER_MANAGER,
  EMBER_GLIMMER_SET_COMPONENT_TEMPLATE,
} from '@ember/canary-features';
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
} from '@glimmer/interfaces';
import { PartialDefinitionImpl } from '@glimmer/opcode-compiler';
import { getDynamicVar, ModifierDefinition } from '@glimmer/runtime';
import { CurlyComponentDefinition } from './component-managers/curly';
import { CustomManagerDefinition } from './component-managers/custom';
import { InternalComponentDefinition, isInternalManager } from './component-managers/internal';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import InternalComponent from './components/internal';
import {
  HelperFactory,
  HelperInstance,
  isInternalManager as isInternalHelperManager,
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
import { Factory as TemplateFactory, OwnedTemplate } from './template';
import { getComponentTemplate } from './utils/component-template';
import { getComponentManager, getHelperManager, getModifierManager } from './utils/managers';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function makeOptions(moduleName: string, namespace?: string): LookupOptions {
  return {
    source: moduleName !== undefined ? `template:${moduleName}` : undefined,
    namespace,
  };
}

function componentFor(
  name: string,
  owner: Owner,
  options?: LookupOptions
): Option<Factory<{}, {}>> {
  let fullName = `component:${name}`;
  return owner.factoryFor(fullName, options) || null;
}

function layoutFor(name: string, owner: Owner, options?: LookupOptions): Option<OwnedTemplate> {
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

  if (EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
    if (component !== null && component.class !== undefined) {
      let layout = getComponentTemplate(component.class);

      if (layout !== null) {
        return { component, layout };
      }
    }
  }

  let layout = layoutFor(name, owner, options);

  if (component === null && layout === null) {
    return null;
  } else {
    return { component, layout } as LookupResult;
  }
}

function lookupComponent(owner: Owner, name: string, options: LookupOptions): Option<LookupResult> {
  if (options.source || options.namespace) {
    let pair = lookupComponentPair(owner, name, options);

    if (pair !== null) {
      return pair;
    }
  }
  return lookupComponentPair(owner, name);
}

let lookupPartial: { templateName: string; owner: Owner } | any;
let templateFor: { owner: Owner; underscored: string; name: string } | any;
let parseUnderscoredName: { templateName: string } | any;

if (PARTIALS) {
  lookupPartial = function(templateName: string, owner: Owner) {
    deprecate(
      `The use of \`{{partial}}\` is deprecated, please refactor the "${templateName}" partial to a component`,
      false,
      {
        id: 'ember-views.partial',
        until: '4.0.0',
        url: 'https://deprecations.emberjs.com/v3.x#toc_ember-views-partial',
      }
    );

    if (templateName === null) {
      return;
    }

    let template = templateFor(owner, parseUnderscoredName(templateName), templateName);

    assert(`Unable to find partial with name "${templateName}"`, Boolean(template));

    return template;
  };

  templateFor = function(owner: any, underscored: string, name: string) {
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

  parseUnderscoredName = function(templateName: string) {
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

export default class RuntimeResolverImpl implements RuntimeResolver<OwnedTemplateMeta> {
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
      action: { manager: new ActionModifierManager(), state: null },
      on: { manager: new OnModifierManager(owner, isInteractive), state: null },
    };
  }

  /***  IRuntimeResolver ***/

  /**
   * public componentDefHandleCount = 0;
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let handle = this.lookupComponentHandle(name, meta);
    if (handle === null) {
      assert(
        `Could not find component named "${name}" (no component or template with that name was found)`
      );
      return null;
    }
    return this.resolve(handle);
  }

  lookupComponentHandle(name: string, meta: OwnedTemplateMeta) {
    let nextHandle = this.handles.length;
    let handle = this.handle(this._lookupComponentDefinition(name, meta));

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
  lookupHelper(name: string, meta: OwnedTemplateMeta): Option<number> {
    let nextHandle = this.handles.length;
    let helper = this._lookupHelper(name, meta);
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
  lookupModifier(name: string, meta: OwnedTemplateMeta): Option<number> {
    return this.handle(this._lookupModifier(name, meta));
  }

  /**
   * Called by CompileTimeLookup to lookup partial
   */
  lookupPartial(name: string, meta: OwnedTemplateMeta): Option<number> {
    if (PARTIALS) {
      let partial = this._lookupPartial(name, meta);
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

  private _lookupHelper(_name: string, meta: OwnedTemplateMeta): Option<Helper> {
    assert(
      `You attempted to overwrite the built-in helper "${_name}" which is not allowed. Please rename the helper.`,
      !(this.builtInHelpers[_name] && meta.owner.hasRegistration(`helper:${_name}`))
    );

    const helper = this.builtInHelpers[_name];
    if (helper !== undefined) {
      return helper;
    }

    const { moduleName } = meta;
    let owner = meta.owner;

    let name = _name;
    let namespace = undefined;

    const options: LookupOptions = makeOptions(moduleName, namespace);

    const factory =
      owner.factoryFor<SimpleHelper | HelperInstance, HelperFactory<SimpleHelper | HelperInstance>>(
        `helper:${name}`,
        options
      ) || owner.factoryFor(`helper:${name}`);

    if (factory === undefined || factory.class === undefined) {
      return null;
    }

    const manager = getHelperManager(owner, factory.class);

    if (manager === undefined) {
      return null;
    }

    if (isInternalHelperManager(manager)) {
      return customHelper(manager, factory);
    } else if (EMBER_GLIMMER_HELPER_MANAGER) {
      return customHelper(manager, factory);
    } else {
      return null;
    }
  }

  private _lookupPartial(name: string, meta: OwnedTemplateMeta): PartialDefinition {
    let owner = meta.owner;
    let templateFactory = lookupPartial(name, owner);
    let template = templateFactory(owner);

    return new PartialDefinitionImpl(name, template);
  }

  private _lookupModifier(name: string, meta: OwnedTemplateMeta) {
    let builtin = this.builtInModifiers[name];

    if (builtin === undefined) {
      let owner = meta.owner;
      let modifier = owner.factoryFor<unknown, FactoryClass>(`modifier:${name}`);
      if (modifier !== undefined) {
        let manager = getModifierManager(owner, modifier.class!);

        return new CustomModifierDefinition(name, modifier, manager!, this.isInteractive);
      }
    }

    return builtin;
  }

  private _lookupComponentDefinition(
    _name: string,
    meta: OwnedTemplateMeta
  ): Option<ComponentDefinition> {
    let name = _name;
    let namespace = undefined;
    let owner = meta.owner;
    let { moduleName } = meta;

    let pair = lookupComponent(owner, name, makeOptions(moduleName, namespace));
    if (pair === null) {
      return null;
    }

    let layout: OwnedTemplate | undefined;
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
    } else if (
      EMBER_GLIMMER_SET_COMPONENT_TEMPLATE &&
      isTemplateOnlyComponent(pair.component.class)
    ) {
      definition = new TemplateOnlyComponentDefinition(name, layout!);
    }

    if (pair.component !== null) {
      assert(`missing component class ${name}`, pair.component.class !== undefined);

      let ComponentClass = pair.component.class!;
      let manager = getComponentManager(owner, ComponentClass);

      if (manager !== undefined) {
        if (isInternalManager(manager)) {
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
