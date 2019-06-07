import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { LookupOptions, Owner, setOwner } from '@ember/-internals/owner';
import { lookupComponent, lookupPartial, OwnedTemplateMeta } from '@ember/-internals/views';
import {
  EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS,
  EMBER_GLIMMER_FN_HELPER,
  EMBER_MODULE_UNIFICATION,
} from '@ember/canary-features';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
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
import InternalComponentManager, {
  InternalComponentDefinition,
} from './component-managers/internal';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import { isHelperFactory, isSimpleHelper } from './helper';
import { default as componentAssertionHelper } from './helpers/-assert-implicit-component-helper-argument';
import { default as classHelper } from './helpers/-class';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as action } from './helpers/action';
import { default as array } from './helpers/array';
import { default as concat } from './helpers/concat';
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
import { CustomModifierDefinition, ModifierManagerDelegate } from './modifiers/custom';
import OnModifierManager from './modifiers/on';
import { populateMacros } from './syntax';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';
import { Factory as TemplateFactory, Injections, OwnedTemplate } from './template';
import { getModifierManager } from './utils/custom-modifier-manager';
import { getManager } from './utils/managers';
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

interface IBuiltInHelpers {
  [name: string]: Helper | undefined;
}

const BUILTINS_HELPERS: IBuiltInHelpers = {
  if: inlineIf,
  action,
  array,
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
  '-get-dynamic-var': getDynamicVar,
  '-mount': mountHelper,
  '-outlet': outletHelper,
  '-assert-implicit-component-helper-argument': componentAssertionHelper,
  fn: undefined,
};

if (EMBER_GLIMMER_FN_HELPER) {
  BUILTINS_HELPERS.fn = fn;
}

interface IBuiltInModifiers {
  [name: string]: ModifierDefinition | undefined;
}

export default class RuntimeResolver implements IRuntimeResolver<OwnedTemplateMeta> {
  public isInteractive: boolean;
  public compiler: LazyCompiler<OwnedTemplateMeta>;

  private handles: any[] = [
    undefined, // ensure no falsy handle
  ];
  private objToHandle = new WeakMap<any, number>();

  private builtInHelpers: IBuiltInHelpers = BUILTINS_HELPERS;

  private builtInModifiers: IBuiltInModifiers;

  // supports directly imported late bound layouts on component.prototype.layout
  private templateCache: Map<Owner, Map<TemplateFactory, OwnedTemplate>> = new Map();
  private componentDefinitionCache: Map<object, ComponentDefinition | null> = new Map();
  private customManagerCache: Map<string, ManagerDelegate<Opaque>> = new Map();

  public templateCacheHits = 0;
  public templateCacheMisses = 0;
  public componentDefinitionCount = 0;
  public helperDefinitionCount = 0;

  constructor(isInteractive: boolean) {
    let macros = new Macros();
    populateMacros(macros);
    this.compiler = new LazyCompiler<OwnedTemplateMeta>(new CompileTimeLookup(this), this, macros);
    this.isInteractive = isInteractive;

    this.builtInModifiers = {
      action: { manager: new ActionModifierManager(), state: null },
      on: { manager: new OnModifierManager(isInteractive), state: null },
    };
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

    assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      !(EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS && name === 'text-area' && handle === null)
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
    let template;
    if (cache === undefined) {
      cache = new Map();
      this.templateCache.set(owner, cache);
    } else {
      template = cache.get(factory);
    }

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
        return SimpleHelperReference.create(helper.compute, args.capture());
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

  private _lookupModifier(name: string, meta: OwnedTemplateMeta) {
    let builtin = this.builtInModifiers[name];

    if (builtin === undefined) {
      let { owner } = meta;
      let modifier = owner.factoryFor(`modifier:${name}`);
      if (modifier !== undefined) {
        let managerFactory = getModifierManager<ModifierManagerDelegate<Opaque>>(modifier.class);
        let manager = managerFactory!(owner);

        return new CustomModifierDefinition(name, modifier, manager, this.isInteractive);
      }
    }

    return builtin;
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
    { moduleName, owner }: OwnedTemplateMeta
  ): Option<ComponentDefinition> {
    assert(
      'Invoking `{{textarea}}` using angle bracket syntax or `component` helper is not yet supported.',
      EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS || _name !== 'textarea'
    );

    assert(
      'Invoking `{{input}}` using angle bracket syntax or `component` helper is not yet supported.',
      EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS || _name !== 'input'
    );

    let name = _name;
    let namespace = undefined;
    if (EMBER_MODULE_UNIFICATION) {
      const parsed = this._parseNameForNamespace(_name);
      name = parsed.name;
      namespace = parsed.namespace;
    }
    let { layout, component } = lookupComponent(owner, name, makeOptions(moduleName, namespace));

    let key = component === undefined ? layout : component;

    if (key === undefined) {
      return null;
    }

    let cachedComponentDefinition = this.componentDefinitionCache.get(key);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);

    let definition: Option<ComponentDefinition> = null;

    if (layout !== undefined && component === undefined && ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
      definition = new TemplateOnlyComponentDefinition(layout);
    }

    if (component !== undefined && component.class !== undefined) {
      let wrapper = getManager(component.class);

      if (wrapper && wrapper.type === 'component') {
        let { factory } = wrapper;

        if (wrapper.internal) {
          assert(`missing layout for internal component ${name}`, layout !== undefined);

          definition = new InternalComponentDefinition(
            factory(owner) as InternalComponentManager<Opaque>,
            component.class,
            layout!
          );
        } else {
          definition = new CustomManagerDefinition(
            name,
            component,
            factory(owner) as ManagerDelegate<Opaque>,
            layout || owner.lookup<OwnedTemplate>(P`template:components/-default`)
          );
        }
      }
    }

    if (definition === null) {
      definition = new CurlyComponentDefinition(
        name,
        component || owner.factoryFor(P`component:-default`),
        null,
        layout! // TODO fix type
      );
    }

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
