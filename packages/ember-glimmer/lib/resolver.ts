import { EMBER_MODULE_UNIFICATION, GLIMMER_CUSTOM_COMPONENT_MANAGER } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import {
  ComponentDefinition,
  Opaque,
  Option,
  RuntimeResolver as IRuntimeResolver,
} from '@glimmer/interfaces';
import { LazyCompiler, Macros, PartialDefinition } from '@glimmer/opcode-compiler';
import { ComponentManager, getDynamicVar, Helper, ModifierManager } from '@glimmer/runtime';
import { FACTORY_FOR, privatize as P } from 'container';
import { ENV } from 'ember-environment';
import { LookupOptions, Owner, setOwner } from 'ember-owner';
import { guidFor } from 'ember-utils';
import { lookupComponent, lookupPartial, OwnedTemplateMeta } from 'ember-views';
import CompileTimeLookup from './compile-time-lookup';
import { CurlyComponentDefinition } from './component-managers/curly';
import CustomComponentManager, { CustomComponentState } from './component-managers/custom';
import DefinitionState from './component-managers/definition-state';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import { isHelperFactory, isSimpleHelper } from './helper';
import { default as classHelper } from './helpers/-class';
import { default as htmlSafeHelper } from './helpers/-html-safe';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as action } from './helpers/action';
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
import { renderHelper } from './syntax/render';
import { Factory as TemplateFactory, Injections, OwnedTemplate } from './template';
import ComponentStateBucket from './utils/curly-component-state-bucket';
import getCustomComponentManager from './utils/custom-component-manager';
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

// returns the qualified / expanded name
// which accounts for local lookup...
function getNormalizedName(obj: any) {
  let factoryManager = FACTORY_FOR.get(obj);
  if (factoryManager) {
    return factoryManager.normalizedName;
  }
}

const BUILTINS_HELPERS = {
  if: inlineIf,
  action,
  concat,
  get,
  hash,
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
  '-render': renderHelper,
};

const BUILTIN_MODIFIERS = {
  action: new ActionModifierManager(),
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
    [name: string]: ModifierManager<Opaque>;
  } = BUILTIN_MODIFIERS;

  // supports directly imported late bound layouts on component.prototype.layout
  private templateCache: WeakMap<Owner, WeakMap<TemplateFactory, OwnedTemplate>> = new WeakMap();
  private componentDefinitionCache: Map<string, ComponentDefinition | null> = new Map();

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
      cache = new WeakMap();
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
  private handle(obj: any | null | undefined) {
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

    if (isSimpleHelper(factory)) {
      const helper = factory.create().compute;
      return (_vm, args) => {
        return SimpleHelperReference.create(helper, args.capture());
      };
    }

    return (vm, args) => {
      const helper = factory.create();
      vm.newDestroyable(helper);
      return ClassBasedHelperReference.create(helper, args.capture());
    };
  }

  private _lookupPartial(name: string, meta: OwnedTemplateMeta): PartialDefinition {
    const template = lookupPartial(name, meta.owner);
    const partial = new PartialDefinition(name, lookupPartial(name, meta.owner));

    if (template) {
      return partial;
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  private _lookupModifier(name: string) {
    let modifier = this.builtInModifiers[name];
    if (modifier !== undefined) {
      return modifier;
    }
    return null;
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

    let ownerId = guidFor(meta.owner);
    let componentDefinitionCacheKey =
      ownerId + '|' + getNormalizedName(component) + '|' + getNormalizedName(layout);
    let cachedComponentDefinition = this.componentDefinitionCache.get(componentDefinitionCacheKey);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    if (layout && !component && ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
      let definition = new TemplateOnlyComponentDefinition(layout);
      this.componentDefinitionCache.set(componentDefinitionCacheKey, definition);
      return definition;
    }

    let manager:
      | ComponentManager<ComponentStateBucket, DefinitionState>
      | CustomComponentManager<CustomComponentState<any>>
      | undefined;

    if (GLIMMER_CUSTOM_COMPONENT_MANAGER && component && component.class) {
      manager = getCustomComponentManager(meta.owner, component.class);
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);
    let definition =
      layout || component
        ? new CurlyComponentDefinition(
            name,
            manager,
            component || meta.owner.factoryFor(P`component:-default`),
            null,
            layout
          )
        : null;

    finalizer();

    this.componentDefinitionCache.set(componentDefinitionCacheKey, definition);

    return definition;
  }
}
