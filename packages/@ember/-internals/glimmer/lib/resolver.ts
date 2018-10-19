import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { LookupOptions, Owner, setOwner } from '@ember/-internals/owner';
import { lookupComponent, lookupPartial, OwnedTemplateMeta } from '@ember/-internals/views';
import { EMBER_MODULE_UNIFICATION, GLIMMER_CUSTOM_COMPONENT_MANAGER } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  ComponentDefinition,
  Opaque,
  Option,
  RuntimeResolver as IRuntimeResolver,
} from '@glimmer/interfaces';
import { LazyCompiler, Macros, PartialDefinition } from '@glimmer/opcode-compiler';
import { getDynamicVar, Helper, ModifierDefinition } from '@glimmer/runtime';
import CompileTimeLookup from './compile-time-lookup';
import { CurlyComponentDefinition } from './component-managers/curly';
import { CustomManagerDefinition, ManagerDelegate } from './component-managers/custom';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import { isHelperFactory, isSimpleHelper } from './helper';
import { default as componentAssertionHelper } from './helpers/-assert-implicit-component-helper-argument';
import { default as classHelper } from './helpers/-class';
import { default as htmlSafeHelper } from './helpers/-html-safe';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as action } from './helpers/action';
import { default as array } from './helpers/array';
import { default as concat } from './helpers/concat';
import { default as eachIn } from './helpers/each-in';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { inlineIf, inlineUnless } from './helpers/if-unless';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import ActionModifierManager from './modifiers/action';
import { populateMacros } from './syntax';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';
import { Factory as TemplateFactory, Injections, OwnedTemplate } from './template';
import { getComponentManager } from './utils/custom-component-manager';
import { ClassBasedHelperReference, SimpleHelperReference } from './utils/references';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function makeOptions(moduleName: string, namespace?: string): LookupOptions {
  return {
    source: moduleName !== undefined ? `template:${moduleName}` : undefined,
    namespace,
  };
}

const BUILTINS_HELPERS = {
  if: inlineIf,
  action,
  concat,
  get,
  hash,
  array,
  log,
  mut,
  'query-params': queryParams,
  readonly,
  unbound,
  unless: inlineUnless,
  '-class': classHelper,
  '-each-in': eachIn,
  '-input-type': inputTypeHelper,
  '-normalize-class': normalizeClassHelper,
  '-html-safe': htmlSafeHelper,
  '-get-dynamic-var': getDynamicVar,
  '-mount': mountHelper,
  '-outlet': outletHelper,
};

if (DEBUG) {
  BUILTINS_HELPERS['-assert-implicit-component-helper-argument'] = componentAssertionHelper;
}

const BUILTIN_MODIFIERS = {
  action: { manager: new ActionModifierManager(), state: null },
};

export default class RuntimeResolver implements IRuntimeResolver<OwnedTemplateMeta> {
  public compiler: LazyCompiler<OwnedTemplateMeta>;

  private handles: any[] = [
    undefined, // ensure no falsy handle
  ];
  private objToHandle = new WeakMap<any, number>();

  private builtInHelpers: {
    [name: string]: Helper | undefined;
  } = BUILTINS_HELPERS;

  private builtInModifiers: {
    [name: string]: ModifierDefinition;
  } = BUILTIN_MODIFIERS;

  // supports directly imported late bound layouts on component.prototype.layout
  private templateCache: Map<Owner, Map<TemplateFactory, OwnedTemplate>> = new Map();
  private componentDefinitionCache: Map<object, ComponentDefinition | null> = new Map();
  private customManagerCache: Map<string, ManagerDelegate<Opaque>> = new Map();

  public templateCacheHits = 0;
  public templateCacheMisses = 0;
  public componentDefinitionCount = 0;
  public helperDefinitionCount = 0;

  constructor() {
    let macros = new Macros();
    populateMacros(macros);
    this.compiler = new LazyCompiler<OwnedTemplateMeta>(new CompileTimeLookup(this), this, macros);
  }

  /***  IRuntimeResolver ***/

  /**
   * public componentDefHandleCount = 0;
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponentDefinition(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    assert('You cannot use `textarea` as a component name.', name !== 'textarea');
    assert('You cannot use `input` as a component name.', name !== 'input');

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
  lookupModifier(name: string, _meta: OwnedTemplateMeta): Option<number> {
    return this.handle(this._lookupModifier(name));
  }

  /**
   * Called by CompileTimeLookup to lookup partial
   */
  lookupPartial(name: string, meta: OwnedTemplateMeta): Option<number> {
    let partial = this._lookupPartial(name, meta);
    return this.handle(partial);
  }

  // end CompileTimeLookup

  /**
   * Creates a template with injections from a directly imported template factory.
   * @param templateFactory the directly imported template factory.
   * @param owner the owner the template instance would belong to if resolved
   */
  createTemplate(factory: TemplateFactory, owner: Owner): OwnedTemplate {
    let cache = this.templateCache.get(owner);
    if (cache === undefined) {
      cache = new Map();
      this.templateCache.set(owner, cache);
    }
    let template = cache.get(factory);
    if (template === undefined) {
      const { compiler } = this;
      const injections: Injections = { compiler };
      setOwner(injections, owner);
      template = factory.create(injections);
      cache.set(factory, template);
      this.templateCacheMisses++;
    } else {
      this.templateCacheHits++;
    }
    return template;
  }

  // needed for lazy compile time lookup
  private handle(obj: Opaque) {
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
    const helper = this.builtInHelpers[_name];
    if (helper !== undefined) {
      return helper;
    }

    const { owner, moduleName } = meta;

    let name = _name;
    let namespace = undefined;
    if (EMBER_MODULE_UNIFICATION) {
      const parsed = this._parseNameForNamespace(_name);
      name = parsed.name;
      namespace = parsed.namespace;
    }

    const options: LookupOptions = makeOptions(moduleName, namespace);

    const factory =
      owner.factoryFor(`helper:${name}`, options) || owner.factoryFor(`helper:${name}`);

    if (!isHelperFactory(factory)) {
      return null;
    }

    return (vm, args) => {
      const helper = factory.create();
      if (isSimpleHelper(helper)) {
        return new SimpleHelperReference(helper.compute, args.capture());
      }
      vm.newDestroyable(helper);
      return ClassBasedHelperReference.create(helper, args.capture());
    };
  }

  private _lookupPartial(name: string, meta: OwnedTemplateMeta): PartialDefinition {
    const template = lookupPartial(name, meta.owner);

    if (template) {
      return new PartialDefinition(name, template);
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  private _lookupModifier(name: string) {
    return this.builtInModifiers[name];
  }

  private _parseNameForNamespace(_name: string) {
    let name = _name;
    let namespace = undefined;
    let namespaceDelimiterOffset = _name.indexOf('::');
    if (namespaceDelimiterOffset !== -1) {
      name = _name.slice(namespaceDelimiterOffset + 2);
      namespace = _name.slice(0, namespaceDelimiterOffset);
    }

    return { name, namespace };
  }

  private _lookupComponentDefinition(
    _name: string,
    meta: OwnedTemplateMeta
  ): Option<ComponentDefinition> {
    let name = _name;
    let namespace = undefined;
    if (EMBER_MODULE_UNIFICATION) {
      const parsed = this._parseNameForNamespace(_name);
      name = parsed.name;
      namespace = parsed.namespace;
    }
    let { layout, component } = lookupComponent(
      meta.owner,
      name,
      makeOptions(meta.moduleName, namespace)
    );

    let key = component === undefined ? layout : component;

    if (key === undefined) {
      return null;
    }

    let cachedComponentDefinition = this.componentDefinitionCache.get(key);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);

    if (layout && !component && ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
      let definition = new TemplateOnlyComponentDefinition(layout);
      finalizer();
      this.componentDefinitionCache.set(key, definition);
      return definition;
    }

    if (GLIMMER_CUSTOM_COMPONENT_MANAGER && component && component.class) {
      let managerId = getComponentManager(component.class);
      if (managerId) {
        let manager = this._lookupComponentManager(meta.owner, managerId);
        assert(
          `Could not find custom component manager '${managerId}' which was specified by ${
            component.class
          }`,
          !!manager
        );

        let definition = new CustomManagerDefinition(
          name,
          component,
          manager,
          layout || meta.owner.lookup<OwnedTemplate>(P`template:components/-default`)
        );
        finalizer();
        this.componentDefinitionCache.set(key, definition);
        return definition;
      }
    }

    let definition =
      layout || component
        ? new CurlyComponentDefinition(
            name,
            component || meta.owner.factoryFor(P`component:-default`),
            null,
            layout! // TODO fix type
          )
        : null;

    finalizer();

    this.componentDefinitionCache.set(key, definition);

    return definition;
  }

  _lookupComponentManager(owner: Owner, managerId: string): ManagerDelegate<Opaque> {
    if (this.customManagerCache.has(managerId)) {
      return this.customManagerCache.get(managerId)!;
    }
    let delegate = owner.lookup<ManagerDelegate<Opaque>>(`component-manager:${managerId}`);

    this.customManagerCache.set(managerId, delegate);

    return delegate;
  }
}
