import lookupPartial, { hasPartial } from 'ember-views/system/lookup_partial';
import {
  Environment as GlimmerEnvironment,
  HelperSyntax,
  AttributeChangeList,
  isSafeString,
  compileLayout
} from 'glimmer-runtime';
import Cache from 'ember-metal/cache';
import { assert, warn, runInDebug } from 'ember-metal/debug';
import { CurlyComponentSyntax, CurlyComponentDefinition } from './syntax/curly-component';
import { DynamicComponentSyntax } from './syntax/dynamic-component';
import { RenderSyntax } from './syntax/render';
import { OutletSyntax } from './syntax/outlet';
import lookupComponent from 'ember-views/utils/lookup-component';
import { STYLE_WARNING } from 'ember-views/system/utils';
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
import { OWNER } from 'container/owner';

const builtInComponents = {
  textarea: '-text-area'
};

function createCurly(args, templates, definition) {
  wrapClassAttribute(args);
  return new CurlyComponentSyntax({ args, definition, templates });
}

function buildTextFieldSyntax({ args, templates }, getDefinition) {
  let definition = getDefinition('-text-field');
  wrapClassAttribute(args);
  return new CurlyComponentSyntax({ args, definition, templates });
}

const builtInDynamicComponents = {
  input({ key, args, templates }, getDefinition) {
    if (args.named.has('type')) {
      let typeArg = args.named.at('type');
      if (typeArg.type === 'value') {
        if (typeArg.value === 'checkbox') {
          assert(
            '{{input type=\'checkbox\'}} does not support setting `value=someBooleanValue`; ' +
            'you must use `checked=someBooleanValue` instead.',
            !args.named.has('value')
          );

          return createCurly(args, templates, getDefinition('-checkbox'));
        } else {
          return buildTextFieldSyntax({ args, templates }, getDefinition);
        }
      }
    } else {
      return buildTextFieldSyntax({ args, templates }, getDefinition);
    }
    return DynamicComponentSyntax.create({ args, templates });
  }
};

const builtInHelpers = {
  if: inlineIf,
  action,
  component: componentHelper,
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
  '-html-safe': htmlSafeHelper
};

import { default as ActionModifierManager } from './modifiers/action';

// TODO we should probably do this transform at build time
function wrapClassAttribute(args) {
  let { named } = args;
  let index = named.keys.indexOf('class');

  if (index !== -1) {
    let { ref, type } = named.values[index];

    if (type === 'get') {
      let propName = ref.parts[ref.parts.length - 1];
      named.values[index] = HelperSyntax.fromSpec(['helper', ['-class'], [['get', ref.parts], propName], null]);
    }
  }

  return args;
}

export default class Environment extends GlimmerEnvironment {
  static create(options) {
    return new Environment(options);
  }

  constructor({ [OWNER]: owner }) {
    super(...arguments);
    this.owner = owner;

    this.uselessAnchor = document.createElement('a');

    this._definitionCache = new Cache(2000, ({ name, source }) => {
      let { component: ComponentClass, layout } = lookupComponent(owner, name, { source });
      if (ComponentClass || layout) {
        return new CurlyComponentDefinition(name, ComponentClass, layout);
      }
    }, ({ name, source }) => {
      return source && owner._resolveLocalLookupName(name, source) || name;
    });

    this._templateCache = new Cache(1000, Template => {
      return Template.create({ env: this });
    }, template => template.id);

    this._compilerCache = new Cache(10, Compiler => {
      return new Cache(2000, template => {
        let compilable = new Compiler(template);
        return compileLayout(compilable, this);
      }, template => template.id);
    }, Compiler => Compiler.id);

    this.builtInModifiers = {
      action: new ActionModifierManager()
    };
  }

  protocolForURL(url) {
    this.uselessAnchor.href = url;
    return this.uselessAnchor.protocol;
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
    let nativeSyntax = super.refineStatement(statement);

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

    assert(`You attempted to overwrite the built-in helper "${key}" which is not allowed. Please rename the helper.`, !(builtInHelpers[key] && this.owner.hasRegistration(`helper:${key}`)));

    if (isSimple && (isInline || isBlock)) {
      // 2. built-in syntax

      if (key === 'component') {
        return DynamicComponentSyntax.create({ args, templates, symbolTable });
      } else if (key === 'render') {
        return new RenderSyntax({ args });
      } else if (key === 'outlet') {
        return new OutletSyntax({ args });
      }

      let internalKey = builtInComponents[key];
      let definition = null;

      if (internalKey) {
        definition = this.getComponentDefinition([internalKey], symbolTable);
      } else if (key.indexOf('-') >= 0) {
        definition = this.getComponentDefinition(path, symbolTable);
      }

      if (definition) {
        return createCurly(args, templates, definition);
      }

      let generateBuiltInSyntax = builtInDynamicComponents[key];
      if (generateBuiltInSyntax) {
        return generateBuiltInSyntax(statement, (path) => this.getComponentDefinition([path], symbolTable));
      }

      assert(`A helper named "${key}" could not be found`, !isBlock || this.hasHelper(key, symbolTable));
    }

    if ((!isSimple && appendType === 'unknown') || appendType === 'self-get') {
      return statement.original.deopt();
    }

    if (!isSimple && path) {
      return DynamicComponentSyntax.fromPath({ path, args, templates, symbolTable });
    }

    assert(`Helpers may not be used in the block form, for example {{#${key}}}{{/${key}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${key})}}{{/if}}.`, !isBlock || !this.hasHelper(key, symbolTable));

    assert(`Helpers may not be used in the element form.`, !nativeSyntax && key && this.hasHelper(key, symbolTable) ? !isModifier : true);
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(path, symbolTable) {
    let name = path[0];
    let source = symbolTable && `template:${symbolTable.getMeta().moduleName}`;
    return this._definitionCache.get({ name, source });
  }

  // normally templates should be exported at the proper module name
  // and cached in the container, but this cache supports templates
  // that have been set directly on the component's layout property
  getTemplate(Template) {
    return this._templateCache.get(Template);
  }

  // a Compiler can wrap the template so it needs its own cache
  getCompiledBlock(Compiler, template) {
    let compilerCache = this._compilerCache.get(Compiler);
    return compilerCache.get(template);
  }

  hasPartial(name) {
    return hasPartial(this, name[0]);
  }

  lookupPartial(name) {
    let partial = {
      template: lookupPartial(this, name[0]).spec
    };

    if (partial) {
      return partial;
    } else {
      throw new Error(`${name} is not a partial`);
    }
  }

  hasHelper(name, symbolTable) {
    let options = symbolTable && { source: `template:${symbolTable.getMeta().moduleName}` } || {};
    return !!builtInHelpers[name[0]] ||
      this.owner.hasRegistration(`helper:${name}`, options) ||
      this.owner.hasRegistration(`helper:${name}`);
  }

  lookupHelper(name, symbolTable) {
    let options = symbolTable && { source: `template:${symbolTable.getMeta().moduleName}` } || {};
    let helper = builtInHelpers[name[0]] ||
      this.owner.lookup(`helper:${name}`, options) ||
      this.owner.lookup(`helper:${name}`);
    // TODO: try to unify this into a consistent protocol to avoid wasteful closure allocations
    if (helper.isInternalHelper) {
      return (vm, args) => helper.toReference(args, this);
    } else if (helper.isHelperInstance) {
      return (vm, args) => SimpleHelperReference.create(helper.compute, args);
    } else if (helper.isHelperFactory) {
      return (vm, args) => ClassBasedHelperReference.create(helper, vm, args);
    } else {
      throw new Error(`${name} is not a helper`);
    }
  }

  hasModifier(name) {
    return !!this.builtInModifiers[name[0]];
  }

  lookupModifier(name) {
    let modifier = this.builtInModifiers[name[0]];

    if (modifier) {
      return modifier;
    } else {
      throw new Error(`${name} is not a modifier`);
    }
  }

  toConditionalReference(reference) {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref, args) {
    let keyPath = args.named.get('key').value();
    return createIterable(ref, keyPath);
  }

  didCreate(component, manager) {
    this.createdComponents.unshift(component);
    this.createdManagers.unshift(manager);
  }

  didDestroy(destroyable) {
    destroyable.destroy();
  }
}

runInDebug(() => {
  let StyleAttributeChangeList = {
    setAttribute(dom, element, attr, value) {
      warn(STYLE_WARNING, (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      AttributeChangeList.setAttribute(...arguments);
    },

    updateAttribute(dom, element, attr, value) {
      warn(STYLE_WARNING, (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      AttributeChangeList.updateAttribute(...arguments);
    }
  };

  Environment.prototype.attributeFor = function(element, attribute, isTrusting, namespace) {
    if (attribute === 'style' && !isTrusting) {
      return StyleAttributeChangeList;
    }

    return GlimmerEnvironment.prototype.attributeFor.call(this, element, attribute, isTrusting);
  };
});
