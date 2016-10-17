import { guidFor, OWNER } from 'ember-utils';
import { Cache, assert, warn, runInDebug } from 'ember-metal';
import {
  lookupPartial,
  hasPartial,
  lookupComponent,
  STYLE_WARNING
} from 'ember-views';
import {
  Environment as GlimmerEnvironment,
  AttributeManager,
  isSafeString,
  compileLayout,
  getDynamicVar
} from 'glimmer-runtime';
import {
  CurlyComponentSyntax,
  CurlyComponentDefinition
} from './syntax/curly-component';
import { findSyntaxBuilder } from './syntax';
import { DynamicComponentSyntax } from './syntax/dynamic-component';
import createIterable from './utils/iterable';
import {
  ConditionalReference,
  SimpleHelperReference,
  ClassBasedHelperReference
} from './utils/references';

import {
  inlineIf,
  inlineUnless
} from './helpers/if-unless';
import { wrapComponentClassAttribute } from './utils/bindings';

import { default as action } from './helpers/action';
import { default as componentHelper } from './helpers/component';
import { default as concat } from './helpers/concat';
import { default as debuggerHelper } from './helpers/debugger';
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

const builtInComponents = {
  textarea: '-text-area'
};

import { default as ActionModifierManager } from './modifiers/action';

export default class Environment extends GlimmerEnvironment {
  static create(options) {
    return new Environment(options);
  }

  constructor({ [OWNER]: owner }) {
    super(...arguments);
    this.owner = owner;
    this.isInteractive = owner.lookup('-environment:main').isInteractive;

    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = undefined;

    installPlatformSpecificProtocolForURL(this);

    this._definitionCache = new Cache(2000, ({ name, source, owner }) => {
      let { component: componentFactory, layout } = lookupComponent(owner, name, { source });

      if ((componentFactory && componentFactory.class) || layout) {
        return new CurlyComponentDefinition(name, componentFactory, layout);
      }
    }, ({ name, source, owner }) => {
      let expandedName = source && owner._resolveLocalLookupName(name, source) || name;
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
      component: componentHelper,
      concat,
      debugger: debuggerHelper,
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
  }

  // Hello future traveler, welcome to the world of syntax refinement.
  // The method below is called by Glimmer's runtime compiler to allow
  // us to take generic statement syntax and refine it to more meaniful
  // syntax for Ember's use case. This on the fly switch-a-roo sounds fine
  // and dandy, however Ember has precedence on statement refinement that you
  // need to be aware of. The presendence for language constructs is as follows:
  //
  // ------------------------
  // Native & Built-in Syntax
  // ------------------------
  //   User-land components
  // ------------------------
  //     User-land helpers
  // ------------------------
  //
  // The one caveat here is that Ember also allows for dashed references that are
  // not a component or helper:
  //
  // export default Component.extend({
  //   'foo-bar': 'LAME'
  // });
  //
  // {{foo-bar}}
  //
  // The heuristic for the above situation is a dashed "key" in inline form
  // that does not resolve to a defintion. In this case refine statement simply
  // isn't going to return any syntax and the Glimmer engine knows how to handle
  // this case.

  refineStatement(statement, symbolTable) {
    // 1. resolve any native syntax – if, unless, with, each, and partial
    let nativeSyntax = super.refineStatement(statement, symbolTable);

    if (nativeSyntax) {
      return nativeSyntax;
    }

    let {
      appendType,
      isSimple,
      isInline,
      isBlock,
      isModifier,
      key,
      path,
      args,
      templates
    } = statement;

    assert(`You attempted to overwrite the built-in helper "${key}" which is not allowed. Please rename the helper.`, !(this.builtInHelpers[key] && this.owner.hasRegistration(`helper:${key}`)));

    if (isSimple && (isInline || isBlock)) {
      // 2. built-in syntax

      let RefinedSyntax = findSyntaxBuilder(key);
      if (RefinedSyntax) {
        return RefinedSyntax.create(this, args, templates, symbolTable);
      }

      let internalKey = builtInComponents[key];
      let definition = null;

      if (internalKey) {
        definition = this.getComponentDefinition([internalKey], symbolTable);
      } else if (key.indexOf('-') >= 0) {
        definition = this.getComponentDefinition(path, symbolTable);
      }

      if (definition) {
        wrapComponentClassAttribute(args);

        return new CurlyComponentSyntax(args, definition, templates, symbolTable);
      }

      assert(`A helper named "${key}" could not be found`, !isBlock || this.hasHelper(path, symbolTable));
    }

    if (!isSimple && appendType === 'unknown') {
      return statement.original.deopt();
    }

    if (!isSimple && path) {
      return DynamicComponentSyntax.fromPath(this, path, args, templates, symbolTable);
    }

    assert(`Helpers may not be used in the block form, for example {{#${key}}}{{/${key}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${key})}}{{/if}}.`, !isBlock || !this.hasHelper(path, symbolTable));

    assert(`Helpers may not be used in the element form.`, (() => {
      if (nativeSyntax) { return true; }
      if (!key) { return true; }

      if (isModifier && !this.hasModifier(path, symbolTable) && this.hasHelper(path, symbolTable)) {
        return false;
      }

      return true;
    })());
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(path, symbolTable) {
    let name = path[0];
    let blockMeta = symbolTable.getMeta();
    let owner = blockMeta.owner;
    let source = blockMeta.moduleName && `template:${blockMeta.moduleName}`;

    return this._definitionCache.get({ name, source, owner });
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

  hasPartial(name, symbolTable) {
    let { owner } = symbolTable.getMeta();
    return hasPartial(name, owner);
  }

  lookupPartial(name, symbolTable) {
    let { owner } = symbolTable.getMeta();
    let partial = {
      template: lookupPartial(name, owner)
    };

    if (partial.template) {
      return partial;
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  hasHelper(nameParts, symbolTable) {
    assert('The first argument passed into `hasHelper` should be an array', Array.isArray(nameParts));

    // helpers are not allowed to include a dot in their invocation
    if (nameParts.length > 1) {
      return false;
    }

    let name = nameParts[0];

    if (this.builtInHelpers[name]) {
      return true;
    }

    let blockMeta = symbolTable.getMeta();
    let owner = blockMeta.owner;
    let options = { source: `template:${blockMeta.moduleName}` };

    return owner.hasRegistration(`helper:${name}`, options) ||
      owner.hasRegistration(`helper:${name}`);
  }

  lookupHelper(nameParts, symbolTable) {
    assert('The first argument passed into `lookupHelper` should be an array', Array.isArray(nameParts));

    let name = nameParts[0];
    let helper = this.builtInHelpers[name];

    if (helper) {
      return helper;
    }

    let blockMeta = symbolTable.getMeta();
    let owner = blockMeta.owner;
    let options = blockMeta.moduleName && { source: `template:${blockMeta.moduleName}` } || {};

    helper = owner.lookup(`helper:${name}`, options) || owner.lookup(`helper:${name}`);

    // TODO: try to unify this into a consistent protocol to avoid wasteful closure allocations
    if (helper.isHelperInstance) {
      return (vm, args) => SimpleHelperReference.create(helper.compute, args);
    } else if (helper.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helper, vm, args);
    } else {
      throw new Error(`${nameParts} is not a helper`);
    }
  }

  hasModifier(nameParts) {
    assert('The first argument passed into `hasModifier` should be an array', Array.isArray(nameParts));

    // modifiers are not allowed to include a dot in their invocation
    if (nameParts.length > 1) {
      return false;
    }

    return !!this.builtInModifiers[nameParts[0]];
  }

  lookupModifier(nameParts) {
    assert('The first argument passed into `lookupModifier` should be an array', Array.isArray(nameParts));

    let modifier = this.builtInModifiers[nameParts[0]];

    if (modifier) {
      return modifier;
    } else {
      throw new Error(`${nameParts} is not a modifier`);
    }
  }

  toConditionalReference(reference) {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref, args) {
    let keyPath = args.named.get('key').value();
    return createIterable(ref, keyPath);
  }

  scheduleInstallModifier() {
    if (this.isInteractive) {
      super.scheduleInstallModifier(...arguments);
    }
  }

  scheduleUpdateModifier() {
    if (this.isInteractive) {
      super.scheduleUpdateModifier(...arguments);
    }
  }

  didDestroy(destroyable) {
    destroyable.destroy();
  }

  begin() {
    this.inTransaction = true;

    super.begin();

    this.destroyedComponents = [];
  }

  commit() {
    // components queued for destruction must be destroyed before firing
    // `didCreate` to prevent errors when removing and adding a component
    // with the same name (would throw an error when added to view registry)
    for (let i = 0; i < this.destroyedComponents.length; i++) {
      this.destroyedComponents[i].destroy();
    }

    super.commit();

    this.inTransaction = false;
  }
}

runInDebug(() => {
  class StyleAttributeManager extends AttributeManager {
    setAttribute(dom, element, value) {
      warn(STYLE_WARNING, (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.setAttribute(...arguments);
    }

    updateAttribute(dom, element, value) {
      warn(STYLE_WARNING, (() => {
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
});
