import lookupPartial, { hasPartial } from 'ember-views/system/lookup_partial';
import {
  Environment as GlimmerEnvironment,
  HelperSyntax
} from 'glimmer-runtime';
import Dict from 'ember-metal/empty_object';
import { assert } from 'ember-metal/debug';
import { CurlyComponentSyntax, CurlyComponentDefinition } from './syntax/curly-component';
import { DynamicComponentSyntax } from './syntax/dynamic-component';
import { OutletSyntax } from './syntax/outlet';
import lookupComponent from 'ember-views/utils/lookup-component';
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

    return new DynamicComponentSyntax({ args, templates });
  }
};

const builtInHelpers = {
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
  '-normalize-class': normalizeClassHelper
};

import { default as ActionModifierManager } from './modifiers/action';

// TODO we should probably do this transform at build time
function wrapClassAttribute(args) {
  let hasClass = args.named.has('class');

  if (hasClass) {
    let { ref, type } = args.named.at('class');

    if (type === 'get') {
      let propName = ref.parts[ref.parts.length - 1];
      let syntax = HelperSyntax.fromSpec(['helper', ['-class'], [['get', ref.parts], propName], null]);
      args.named.add('class', syntax);
    }
  }
  return args;
}

export default class Environment extends GlimmerEnvironment {
  static create(options) {
    return new Environment(options);
  }

  constructor({ dom, [OWNER]: owner }) {
    super(dom);
    this.owner = owner;
    this._components = new Dict();
    this._templateCache = new Dict();
    this.builtInModifiers = {
      action: new ActionModifierManager()
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

  refineStatement(statement) {
    // 1. resolve any native syntax – if, unless, with, each, and partial
    let nativeSyntax = super.refineStatement(statement);

    if (nativeSyntax) {
      return nativeSyntax;
    }

    let {
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

      let generateBuiltInSyntax = builtInDynamicComponents[key];
      // Check if it's a keyword
      let mappedKey = builtInComponents[key];

      if (key === 'component') {
        return new DynamicComponentSyntax({ args, templates });
      } else if (key === 'outlet') {
        return new OutletSyntax({ args });
      }

      let internalKey = builtInComponents[key];
      let definition = null;

      if (internalKey) {
        definition = this.getComponentDefinition([internalKey]);
      } else if (key.indexOf('-') >= 0) {
        definition = this.getComponentDefinition(path);
      } else if (mappedKey) {
        definition = this.getComponentDefinition([mappedKey]);
      }

      if (definition) {
        return createCurly(args, templates, definition);
      } else if (generateBuiltInSyntax) {
        return generateBuiltInSyntax(statement, (path) => this.getComponentDefinition([path]));
      }

      assert(`Could not find component named "${key}" (no component or template with that name was found)`, !isBlock || this.hasHelper(key));
    }

    assert(`Helpers may not be used in the block form, for example {{#${key}}}{{/${key}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${key})}}{{/if}}.`, !isBlock || !this.hasHelper(key));

    assert(`Helpers may not be used in the element form.`, !nativeSyntax && key && this.hasHelper(key) ? !isModifier : true);
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(path) {
    let name = path[0];
    let definition = this._components[name];

    if (!definition) {
      let { component: ComponentClass, layout } = lookupComponent(this.owner, name);

      if (ComponentClass || layout) {
        definition = this._components[name] = new CurlyComponentDefinition(name, ComponentClass, layout);
      }
    }

    return definition;
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

  hasHelper(name) {
    return !!builtInHelpers[name[0]] || this.owner.hasRegistration(`helper:${name}`);
  }

  lookupHelper(name) {
    let helper = builtInHelpers[name[0]] || this.owner.lookup(`helper:${name}`);
    // TODO: try to unify this into a consistent protocol to avoid wasteful closure allocations
    if (helper.isInternalHelper) {
      return (args) => helper.toReference(args);
    } else if (helper.isHelperInstance) {
      return (args) => SimpleHelperReference.create(helper.compute, args);
    } else if (helper.isHelperFactory) {
      return (args) => ClassBasedHelperReference.create(helper, args);
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
