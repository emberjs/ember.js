import {
  Reference,
} from '@glimmer/reference';
import {
  AttributeManager,
  CompilableLayout,
  CompiledDynamicProgram,
  compileLayout,
  ComponentDefinition,
  Environment as GlimmerEnvironment,
  getDynamicVar,
  Helper,
  isSafeString,
  ModifierManager,
  PrimitiveReference,
  PartialDefinition,
  Simple,
} from '@glimmer/runtime';
import {
  Destroyable, Opaque,
} from '@glimmer/util';
import { warn } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart, Cache } from 'ember-metal';
import { guidFor, OWNER } from 'ember-utils';
import {
  constructStyleDeprecationMessage,
  hasPartial,
  lookupComponent,
  lookupPartial,
} from 'ember-views';
import {
  CurlyComponentDefinition,
} from './component-managers/curly';
import {
  populateMacros,
} from './syntax';
import DebugStack from './utils/debug-stack';
import createIterable from './utils/iterable';
import {
  ClassBasedHelperReference,
  ConditionalReference,
  RootPropertyReference,
  SimpleHelperReference,
  UpdatableReference,
} from './utils/references';

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
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';

import { default as ActionModifierManager } from './modifiers/action';
import installPlatformSpecificProtocolForURL from './protocol-for-url';

import {
  EMBER_MODULE_UNIFICATION,
  GLIMMER_CUSTOM_COMPONENT_MANAGER,
} from 'ember/features';
import { Container, OwnedTemplate, WrappedTemplateFactory } from './template';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function isTemplateFactory(template: OwnedTemplate | WrappedTemplateFactory): template is WrappedTemplateFactory {
  return typeof (template as WrappedTemplateFactory).create === 'function';
}

export interface CompilerFactory {
  id: string;
  new (template: OwnedTemplate | undefined): CompilableLayout;
}

export default class Environment extends GlimmerEnvironment {
  static create(options: any) {
    return new this(options);
  }

  public owner: Container;
  public isInteractive: boolean;
  public destroyedComponents: Destroyable[];
  public builtInModifiers: {
    [name: string]: ModifierManager<Opaque>;
  };
  public builtInHelpers: {
    [name: string]: Helper;
  };
  public debugStack: typeof DebugStack;
  public inTransaction: boolean;
  private _definitionCache: Cache<{
    name: string;
    source: string;
    owner: Container;
  }, CurlyComponentDefinition | undefined>;
  private _templateCache: Cache<{
    Template: WrappedTemplateFactory | OwnedTemplate;
    owner: Container;
  }, OwnedTemplate>;
  private _compilerCache: Cache<CompilerFactory, Cache<OwnedTemplate, CompiledDynamicProgram>>;

  constructor(injections: any) {
    super(injections);
    this.owner = injections[OWNER];
    this.isInteractive = this.owner.lookup<any>('-environment:main').isInteractive;

    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = [];

    installPlatformSpecificProtocolForURL(this);

    this._definitionCache = new Cache(2000, ({ name, source, owner }) => {
      let { component: componentFactory, layout } = lookupComponent(owner, name, { source });
      let customManager: any;
      if (componentFactory || layout) {
        if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
          let managerId = layout && layout.meta.managerId;

          if (managerId) {
            customManager = owner.factoryFor<any>(`component-manager:${managerId}`).class;
          }
        }
        return new CurlyComponentDefinition(name, componentFactory, layout, undefined, customManager);
      }
      return undefined;
    }, ({ name, source, owner }) => {
      let expandedName = source && this._resolveLocalLookupName(name, source, owner) || name;

      let ownerGuid = guidFor(owner);

      return ownerGuid + '|' + expandedName;
    });

    this._templateCache = new Cache(1000, ({ Template, owner }) => {
      if (isTemplateFactory(Template)) {
        // we received a factory
        return Template.create({ env: this, [OWNER]: owner });
      } else {
        // we were provided an instance already
        return Template;
      }
    }, ({ Template, owner }) => guidFor(owner) + '|' + Template.id);

    this._compilerCache = new Cache(10, (Compiler) => {
      return new Cache(2000, (template) => {
        let compilable = new Compiler(template);
        return compileLayout(compilable, this);
      }, (template) => {
        let owner = template.meta.owner;
        return guidFor(owner) + '|' + template.id;
      });
    }, (Compiler) => Compiler.id);

    this.builtInModifiers = {
      action: new ActionModifierManager(),
    };

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
    };

    if (DEBUG) {
      this.debugStack = new DebugStack();
    }
  }

  // this gets clobbered by installPlatformSpecificProtocolForURL
  // it really should just delegate to a platform specific injection
  protocolForURL(s: string): string {
    return s;
  }

  _resolveLocalLookupName(name: string, source: string, owner: any) {
    return EMBER_MODULE_UNIFICATION ? `${source}:${name}`
      : owner._resolveLocalLookupName(name, source);
  }

  macros() {
    let macros = super.macros();
    populateMacros(macros.blocks, macros.inlines);
    return macros;
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(name: string, { owner, moduleName }: any): ComponentDefinition<Opaque> {
    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);
    let source = moduleName && `template:${moduleName}`;
    let definition = this._definitionCache.get({ name, source, owner });
    finalizer();
    // TODO the glimmer-vm wants this to always have a def
    // but internally we need it to sometimes be undefined
    return definition!;
  }

  // normally templates should be exported at the proper module name
  // and cached in the container, but this cache supports templates
  // that have been set directly on the component's layout property
  getTemplate(Template: WrappedTemplateFactory, owner: Container): OwnedTemplate {
    return this._templateCache.get({ Template, owner });
  }

  // a Compiler can wrap the template so it needs its own cache
  getCompiledBlock(Compiler: any, template: OwnedTemplate) {
    let compilerCache = this._compilerCache.get(Compiler);
    return compilerCache.get(template);
  }

  hasPartial(name: string, meta: any): boolean {
    return hasPartial(name, meta.owner);
  }

  lookupPartial(name: string, meta: any): PartialDefinition<any> {
    let partial = {
      name,
      template: lookupPartial(name, meta.owner),
    };

    if (partial.template) {
      return partial;
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  hasHelper(name: string, { owner, moduleName }: {owner: Container, moduleName: string}): boolean {
    if (name === 'component' || this.builtInHelpers[name]) {
      return true;
    }

    let options = { source: `template:${moduleName}` };

    return owner.hasRegistration(`helper:${name}`, options) ||
      owner.hasRegistration(`helper:${name}`);
  }

  lookupHelper(name: string, meta: any): Helper {
    if (name === 'component') {
      return (vm, args) => componentHelper(vm, args, meta);
    }

    let { owner, moduleName } = meta;
    let helper = this.builtInHelpers[name];

    if (helper) {
      return helper;
    }

    let options = moduleName && { source: `template:${moduleName}` } || {};
    let helperFactory = owner.factoryFor(`helper:${name}`, options) || owner.factoryFor(`helper:${name}`);

    // TODO: try to unify this into a consistent protocol to avoid wasteful closure allocations
    if (helperFactory.class.isHelperInstance) {
      return (_vm, args) => SimpleHelperReference.create(helperFactory.class.compute, args.capture());
    } else if (helperFactory.class.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helperFactory, vm, args.capture());
    } else {
      throw new Error(`${name} is not a helper`);
    }
  }

  hasModifier(name: string) {
    return !!this.builtInModifiers[name];
  }

  lookupModifier(name: string) {
    let modifier = this.builtInModifiers[name];

    if (modifier) {
      return modifier;
    } else {
      throw new Error(`${name} is not a modifier`);
    }
  }

  toConditionalReference(reference: UpdatableReference): ConditionalReference | RootPropertyReference | PrimitiveReference<any> {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref: Reference<Opaque>, key: string) {
    return createIterable(ref, key);
  }

  scheduleInstallModifier(modifier: any, manager: any): void {
    if (this.isInteractive) {
      super.scheduleInstallModifier(modifier, manager);
    }
  }

  scheduleUpdateModifier(modifier: any, manager: any) {
    if (this.isInteractive) {
      super.scheduleUpdateModifier(modifier, manager);
    }
  }

  didDestroy(destroyable: Destroyable) {
    destroyable.destroy();
  }

  begin() {
    this.inTransaction = true;

    super.begin();
  }

  commit() {
    let destroyedComponents = this.destroyedComponents;
    this.destroyedComponents = [];
    // components queued for destruction must be destroyed before firing
    // `didCreate` to prevent errors when removing and adding a component
    // with the same name (would throw an error when added to view registry)
    for (let i = 0; i < destroyedComponents.length; i++) {
      destroyedComponents[i].destroy();
    }

    super.commit();

    this.inTransaction = false;
  }
}

if (DEBUG) {
  class StyleAttributeManager extends AttributeManager {
    setAttribute(dom: Environment, element: Simple.Element, value: Opaque) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value == null || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.setAttribute(dom, element, value);
    }

    updateAttribute(dom: Environment, element: Element, value: Opaque) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value == null || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.updateAttribute(dom, element, value);
    }
  }

  let STYLE_ATTRIBUTE_MANANGER = new StyleAttributeManager('style');

  Environment.prototype.attributeFor = function(element, attribute, isTrusting) {
    if (attribute === 'style' && !isTrusting) {
      return STYLE_ATTRIBUTE_MANANGER;
    }

    return GlimmerEnvironment.prototype.attributeFor.call(this, element, attribute, isTrusting);
  };
}
