import {
  ComponentDefinition,
  Opaque,
  Option,
  RuntimeResolver as IRuntimeResolver
} from '@glimmer/interfaces';
import { LazyOpcodeBuilder, Macros, OpcodeBuilderConstructor, PartialDefinition, TemplateOptions } from '@glimmer/opcode-compiler';
import { LazyConstants, Program } from '@glimmer/program';
import {
  getDynamicVar,
  Helper,
  ModifierManager,
} from '@glimmer/runtime';
import { privatize as P } from 'container';
import { assert } from 'ember-debug';
import { ENV } from 'ember-environment';
import { _instrumentStart } from 'ember-metal';
import { LookupOptions, Owner, setOwner } from 'ember-utils';
import {
  lookupComponent,
  lookupPartial,
  OwnedTemplateMeta,
} from 'ember-views';
import CompileTimeLookup from './compile-time-lookup';
import { CurlyComponentDefinition } from './component-managers/curly';
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
import { ClassBasedHelperReference, SimpleHelperReference } from './utils/references';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function makeOptions(moduleName: string) {
  return moduleName !== undefined ? { source: `template:${moduleName}`} : undefined;
}

const BUILTINS_HELPERS = {
  'if': inlineIf,
  action,
  concat,
  get,
  hash,
  log,
  mut,
  'query-params': queryParams,
  readonly,
  unbound,
  'unless': inlineUnless,
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
  public templateOptions: TemplateOptions<OwnedTemplateMeta> = {
    program: new Program<OwnedTemplateMeta>(new LazyConstants(this)),
    macros: new Macros(),
    resolver: new CompileTimeLookup(this),
    Builder: LazyOpcodeBuilder as OpcodeBuilderConstructor,
  };

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

  public templateCacheHits = 0;
  public templateCacheMisses = 0;
  public componentDefinitionCount = 0;

  constructor() {
    populateMacros(this.templateOptions.macros);
  }

  /***  IRuntimeResolver ***/

  /**
   * public componentDefHandleCount = 0;
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let handle = this.lookupComponentDefinition(name, meta);
    if (handle === null) {
      assert(`Could not find component named "${name}" (no component or template with that name was found)`);
      return null;
    }
    return this.resolve(handle);
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
    let handle = this._lookupHelper(name, meta);
    if (handle !== null) {
      return this.handle(handle);
    }
    return null;
  }

  /**
   * Called by CompileTimeLookup compiling the Component OpCode
   */
  lookupComponentDefinition(name: string, meta: OwnedTemplateMeta): Option<number> {
    let nextHandle = this.handles.length;
    let handle = this.handle(this._lookupComponentDefinition(name, meta));
    if (nextHandle === handle) {
      this.componentDefinitionCount++;
    }
    return handle;
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
      const injections: Injections = { options: this.templateOptions };
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

  private _lookupHelper(name: string, meta: OwnedTemplateMeta): Option<Helper> {
    const helper = this.builtInHelpers[name];
    if (helper !== undefined) {
      return helper;
    }

    const { owner, moduleName } = meta;

    const options: LookupOptions | undefined = makeOptions(moduleName);

    const factory = owner.factoryFor(`helper:${name}`, options) || owner.factoryFor(`helper:${name}`);

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
    const partial = new PartialDefinition( name, lookupPartial(name, meta.owner));

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

  private _lookupComponentDefinition(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let { layout, component } = lookupComponent(meta.owner, name, makeOptions(meta.moduleName));

    if (layout && !component && ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
      return new TemplateOnlyComponentDefinition(layout);
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);
    let definition = (layout || component) ?
      new CurlyComponentDefinition(
        name,
        undefined,
        component || meta.owner.factoryFor(P`component:-default`),
        null,
        layout
      ) : null;

    finalizer();
    return definition;
  }
}
