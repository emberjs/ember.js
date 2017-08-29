import { guidFor, OWNER } from 'ember-utils';
import { Cache, _instrumentStart } from 'ember-metal';
import { warn } from 'ember-debug';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import { DEBUG } from 'ember-env-flags';
import {
  lookupPartial,
  hasPartial,
  lookupComponent,
  constructStyleDeprecationMessage
} from 'ember-views';
import {
  DefaultEnvironment,
  Environment as GlimmerEnvironment,
  Modifier,
  getDynamicVar,
  ModifierManager
} from '@glimmer/runtime';
import { Dict, Opaque } from '@glimmer/interfaces';
import { Reference, OpaqueIterable } from '@glimmer/reference';
import {
  CurlyComponentDefinition
} from './component-managers/curly';
import {
  populateMacros
} from './syntax';
import createIterable from './utils/iterable';
import {
  ConditionalReference,
  SimpleHelperReference,
  ClassBasedHelperReference
} from './utils/references';
import DebugStack from './utils/debug-stack';

import {
  inlineIf,
  inlineUnless
} from './helpers/if-unless';
import { default as action } from './helpers/action';
import { default as componentHelper } from './helpers/component';
import { default as concat } from './helpers/concat';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { default as loc } from './helpers/loc';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import { default as classHelper } from './helpers/-class';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as queryParams } from './helpers/query-param';
import { default as eachIn } from './helpers/each-in';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as htmlSafeHelper } from './helpers/-html-safe';

import installPlatformSpecificProtocolForURL from './protocol-for-url';
import { default as ActionModifierManager } from './modifiers/action';

import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER
} from 'ember/features';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

interface Owner {
  lookup<T>(key: string): T;
  factoryFor<T>(key: string): { class: T };
}

interface DefinitionKey {
  name: string;
  source: string;
  owner: Owner;
}

export default class Environment extends DefaultEnvironment {
  protocolForURL(s: string): string {
    throw new Error("Monkey patched. TODO: Remove this");
  }

  static create(options: Dict<Opaque>) {
    return new this(options[OWNER] as Owner);
  }

  protected owner: Owner;
  protected isInteractive: boolean;
  protected destroyedComponents: { destroy(): void }[] = [];
  protected builtInModifiers: any;
  protected builtInHelpers: any;
  protected debugStack: any;
  protected _definitionCache: any;
  protected _templateCache: any;
  protected _compilerCache: any;

  public inTransaction = false;

  constructor(owner: Owner) {
    super();
    this.owner = owner;
    this.isInteractive = owner.lookup<{ isInteractive: boolean }>('-environment:main').isInteractive;

    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = [];

    installPlatformSpecificProtocolForURL(this);

    this._definitionCache = new Cache(2000, ({ name, source, owner }) => {
      let { component: componentFactory, layout } = lookupComponent(owner, name, { source });
      let customManager = undefined;

      if (componentFactory || layout) {
        if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
          let managerId = layout && layout.meta.managerId;

          if (managerId) {
            customManager = owner.factoryFor(`component-manager:${managerId}`).class;
          }
        }
        return new CurlyComponentDefinition(name, componentFactory, layout, customManager);
      }
    }, ({ name, source, owner }) => {
      let expandedName = source && this._resolveLocalLookupName(name, source, owner) || name;

      let ownerGuid = guidFor(owner);

      return ownerGuid + '|' + expandedName;
    });

    this._templateCache = new Cache(1000, ({ Template, owner }) => {
      if (Template.create) {
        // we received a factory
        return Template.create({ env: this, [OWNER]: owner });
      } else {
        // we were provided an instance already
        return Template;
      }
    }, ({ Template, owner }) => guidFor(owner) + '|' + Template.id);

    this._compilerCache = new Cache(10, Compiler => {
      return new Cache(2000, (template) => {
        let compilable = new Compiler(template);
        return compileLayout(compilable, this);
      }, (template)=> {
        let owner = template.meta.owner;
        return guidFor(owner) + '|' + template.id;
      });
    }, Compiler => Compiler.id);

    this.builtInModifiers = {
      action: new ActionModifierManager()
    };

    this.builtInHelpers = {
      if: inlineIf,
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
      unless: inlineUnless,
      '-class': classHelper,
      '-each-in': eachIn,
      '-input-type': inputTypeHelper,
      '-normalize-class': normalizeClassHelper,
      '-html-safe': htmlSafeHelper,
      '-get-dynamic-var': getDynamicVar
    };

    if (DEBUG) {
      this.debugStack = new DebugStack()
    }
  }

  _resolveLocalLookupName(name, source, owner) {
    return EMBER_MODULE_UNIFICATION ? `${source}:${name}`
      : owner._resolveLocalLookupName(name, source);
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(name, { owner, moduleName }) {
    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);
    let source = moduleName && `template:${moduleName}`;
    let definition = this._definitionCache.get({ name, source, owner });
    finalizer();
    return definition;
  }

  // normally templates should be exported at the proper module name
  // and cached in the container, but this cache supports templates
  // that have been set directly on the component's layout property
  getTemplate(Template, owner) {
    return this._templateCache.get({ Template, owner });
  }

  // a Compiler can wrap the template so it needs its own cache
  getCompiledBlock(Compiler, template) {
    let compilerCache = this._compilerCache.get(Compiler);
    return compilerCache.get(template);
  }

  hasPartial(name, { owner }) {
    return hasPartial(name, owner);
  }

  lookupPartial(name, { owner }) {
    let partial = {
      template: lookupPartial(name, owner)
    };

    if (partial.template) {
      return partial;
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  hasHelper(name, { owner, moduleName }) {
    if (name === 'component' || this.builtInHelpers[name]) {
      return true;
    }

    let options = { source: `template:${moduleName}` };

    return owner.hasRegistration(`helper:${name}`, options) ||
      owner.hasRegistration(`helper:${name}`);
  }

  lookupHelper(name, meta) {
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
      return (vm, args) => SimpleHelperReference.create(helperFactory.class.compute, args.capture());
    } else if (helperFactory.class.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helperFactory, vm, args.capture());
    } else {
      throw new Error(`${name} is not a helper`);
    }
  }

  hasModifier(name) {
    return !!this.builtInModifiers[name];
  }

  lookupModifier(name) {
    let modifier = this.builtInModifiers[name];

    if (modifier) {
      return modifier;
    } else {
      throw new Error(`${name} is not a modifier`);
    }
  }

  toConditionalReference(reference) {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref: Reference, key: string): OpaqueIterable {
    return createIterable(ref, key) as any;
  }

  scheduleInstallModifier(modifier: Modifier, manager: ModifierManager) {
    if (this.isInteractive) {
      super.scheduleInstallModifier(modifier, manager);
    }
  }

  scheduleUpdateModifier(modifier: Modifier, manager: ModifierManager) {
    if (this.isInteractive) {
      super.scheduleUpdateModifier(modifier, manager);
    }
  }

  didDestroy(destroyable) {
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
      destroyedComponents[i]!.destroy();
    }

    super.commit();

    this.inTransaction = false;
  }
}

if (DEBUG) {
  class StyleAttributeManager extends AttributeManager {
    setAttribute(dom, element, value) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.setAttribute(...arguments);
    }

    updateAttribute(dom, element, value) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.updateAttribute(...arguments);
    }
  }

  let STYLE_ATTRIBUTE_MANANGER = new StyleAttributeManager('style');

  Environment.prototype.attributeFor = function(element, attribute, isTrusting, namespace) {
    if (attribute === 'style' && !isTrusting) {
      return STYLE_ATTRIBUTE_MANANGER;
    }

    return GlimmerEnvironment.prototype.attributeFor.call(this, element, attribute, isTrusting);
  };
}
