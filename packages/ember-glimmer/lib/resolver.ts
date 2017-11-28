import {
  ComponentDefinition,
  Opaque,
  Option,
  RuntimeResolver as IRuntimeResolver,
  VMHandle
} from '@glimmer/interfaces';
import { getDynamicVar, Helper, ModifierManager, PartialDefinition, ScannableTemplate, Invocation } from '@glimmer/runtime';
import { LookupOptions, Owner } from 'ember-utils';
import {
  lookupComponent,
  lookupPartial,
  TemplateMeta,
} from 'ember-views';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';
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
import { default as loc } from './helpers/loc';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as outlet } from './helpers/outlet';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import ActionModifierManager from './modifiers/action';
import { ClassBasedHelperReference, SimpleHelperReference } from './utils/references';
import { CompileOptions } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock, SerializedTemplate } from '@glimmer/wire-format';

function makeOptions(moduleName: string) {
  return moduleName !== undefined ? { source: `template:${moduleName}`} : undefined;
}

export default class RuntimeResolver implements IRuntimeResolver<TemplateMeta> {
  public builtInHelpers: {
    [name: string]: Helper | undefined;
  };

  public builtInModifiers: {
    [name: string]: ModifierManager<Opaque>;
  };

  private handles: any[] = [];

  constructor(public owner: Owner) {
    this.builtInHelpers = {
      'if': inlineIf,
      action,
      concat,
      get,
      hash,
      loc,
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

    this.builtInModifiers = {
      action: new ActionModifierManager(),
    };
  }

  /***  IRuntimeResolver ***/

  /**
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, meta: TemplateMeta): Option<ComponentDefinition> {
    let handle = this.lookupComponentDefinition(name, meta);
    if (handle === null) return null;
    return this.resolve(handle);
  }

  lookupPartial(name: string, meta: TemplateMeta): Option<number> {
    let partial = this._lookupPartial(name, meta);
    return this.getHandle(partial);
  }

  /**
   * Called by RuntimeConstants to lookup unresolved handles.
   */
  resolve<U>(handle: number): U {
    return this.handles[handle];
  }
  // End IRuntimeResolver

  compileTemplate(_handle: number, layoutName: string, create: (block: SerializedTemplate<any>, options: CompileOptions<Opaque>) => Invocation) {
    let template = this.owner.lookup<ScannableTemplate>(`template:${layoutName}`);

    // TODO: handle template not found
    let { parsedLayout, options } = template as any;
    return create(parsedLayout, options);
  }

  /**
   * Called by CompileTimeLookup compiling Unknown or Helper OpCode
   */
  lookupHelper(name: string, meta: TemplateMeta): Option<number> {
    let handle = this._lookupHelper(name, meta);
    if (handle !== null) {
      return this.getHandle(handle);
    }
    return null;
  }

  /**
   * Called by CompileTimeLookup compiling the Component OpCode
   */
  lookupComponentDefinition(name: string, meta: TemplateMeta): Option<number> {
    return this.getHandle(
      this._lookupComponentDefinition(name, meta));
  }

  /**
   * Called by CompileTimeLookup compiling the
   */
  lookupModifier(name: string, _meta: TemplateMeta): Option<number> {
    return this.getHandle(
      this._lookupModifier(name));
  }
  // end CompileTimeLookup

  private _lookupHelper(name: string, meta: TemplateMeta): Option<Helper> {
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
      return (_vm, args) => SimpleHelperReference.create(helperFactory.class.compute, args.capture());
    } else if (helperFactory && helperFactory.class.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helperFactory, vm, args.capture());
    } else {
      return null;
      // throw new Error(`${name} is not a helper`);
    }
  }

  private _lookupPartial(name: string, meta: TemplateMeta): PartialDefinition {
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

  private _lookupComponentDefinition(name: string, meta: TemplateMeta): Option<ComponentDefinition> {
    let { layout } = lookupComponent(meta.owner, name, makeOptions(meta.moduleName));

    let customManager;
    if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
      let managerId = layout && layout.referrer.managerId;

      if (managerId) {
        customManager = meta.owner.factoryFor<any>(`component-manager:${managerId}`).class;
      }
    }

    let layoutHandle = this.getHandle(layout) as Option<VMHandle>;

    return new CurlyComponentDefinition(name, customManager, undefined, layoutHandle, customManager);
  }

  private getHandle(obj: any | null | undefined) {
    if (obj === undefined || obj === null) {
      return null;
    }
    let handle: number | undefined = obj.__handle;
    if (handle === undefined) {
      handle = obj.__handle = this.handles.push(obj) - 1;
    }
    return handle;
  }
}
