import {
  ComponentDefinition,
  Opaque,
  Option,
  RuntimeResolver as IRuntimeResolver,
  VMHandle
} from '@glimmer/interfaces';
import { LazyOpcodeBuilder, Macros, OpcodeBuilderConstructor, TemplateOptions } from '@glimmer/opcode-compiler';
import { LazyConstants, Program } from '@glimmer/program';
import {
  getDynamicVar,
  Helper,
  Invocation,
  ModifierManager,
  PartialDefinition
} from '@glimmer/runtime';
import { privatize as P } from 'container';
import { _instrumentStart } from 'ember-metal';
import { LookupOptions } from 'ember-utils';
import {
  lookupComponent,
  lookupPartial,
  OwnedTemplateMeta,
} from 'ember-views';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';
import CompileTimeLookup from './compile-time-lookup';
import { CurlyComponentDefinition } from './component-managers/curly';
import { default as classHelper } from './helpers/-class';
import { default as htmlSafeHelper } from './helpers/-html-safe';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as action } from './helpers/action';
import { default as componentHelper } from './helpers/component';
import { default as concat } from './helpers/concat';
import { default as eachIn } from './helpers/each-in';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import {
  inlineIf,
  inlineUnless,
} from './helpers/if-unless';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as outlet } from './helpers/outlet';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import ActionModifierManager from './modifiers/action';
import { populateMacros } from './syntax';
import { OwnedTemplate } from './template';
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
  '-outlet': outlet,
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

  // creates compileOptions for DI
  public static create() {
    return new this().templateOptions;
  }

  private handles: any[] = [];
  private objToHandle = new WeakMap<any, number>();

  private builtInHelpers: {
    [name: string]: Helper | undefined;
  } = BUILTINS_HELPERS;

  private builtInModifiers: {
    [name: string]: ModifierManager<Opaque>;
  } = BUILTIN_MODIFIERS;

  constructor() {
    populateMacros(this.templateOptions.macros);
  }

  /***  IRuntimeResolver ***/

  /**
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let handle = this.lookupComponentDefinition(name, meta);
    if (handle === null) return null;
    return this.resolve(handle);
  }

  lookupPartial(name: string, meta: OwnedTemplateMeta): Option<number> {
    let partial = this._lookupPartial(name, meta);
    return this.handle(partial);
  }

  /**
   * Called by RuntimeConstants to lookup unresolved handles.
   */
  resolve<U>(handle: number): U {
    return this.handles[handle];
  }
  // End IRuntimeResolver

  compileTemplate(template: OwnedTemplate, create: (template: OwnedTemplate, templateOptions: TemplateOptions<OwnedTemplateMeta>) => Invocation): Invocation {
    return create(template, this.templateOptions);
  }

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
    return this.handle(this._lookupComponentDefinition(name, meta));
  }

  /**
   * Called by CompileTimeLookup compiling the
   */
  lookupModifier(name: string, _meta: OwnedTemplateMeta): Option<number> {
    return this.handle(this._lookupModifier(name));
  }
  // end CompileTimeLookup

  // needed for latebound
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
    if (name === 'component') {
      return (vm, args) => componentHelper(vm, args, meta);
    }

    const helper = this.builtInHelpers[name];
    if (helper !== undefined) {
      return helper;
    }

    const { owner, moduleName } = meta;

    const options: LookupOptions | undefined = makeOptions(moduleName);

    const helperFactory = owner.factoryFor(`helper:${name}`, options) || owner.factoryFor(`helper:${name}`);

    // TODO: try to unify this into a consistent protocol to avoid wasteful closure allocations
    if (helperFactory && helperFactory.class.isHelperInstance) {
      return (vm, args) => SimpleHelperReference.create(helperFactory, vm, args.capture());
    } else if (helperFactory && helperFactory.class.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helperFactory, vm, args.capture());
    } else {
      return null;
      // throw new Error(`${name} is not a helper`);
    }
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
    } else {
      throw new Error(`${name} is not a modifier`);
    }
  }

  private _lookupComponentDefinition(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let { layout, component } = lookupComponent(meta.owner, name, makeOptions(meta.moduleName));

    let customManager;
    if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
      let managerId = layout && layout.referrer.managerId;

      if (managerId) {
        customManager = meta.owner.factoryFor<any>(`component-manager:${managerId}`).class;
      }
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);
    let layoutHandle = this.handle(layout) as Option<VMHandle>;
    let definition = (layout || component) ?
      new CurlyComponentDefinition(
        name,
        customManager,
        component || meta.owner.factoryFor(P`component:-default`),
        layoutHandle,
        layout
      ) : null;

    finalizer();
    return definition;
  }
}
