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
import lookupComponent from './utils/lookup-component';
import createIterable from './utils/iterable';
import {
  RootReference,
  ConditionalReference,
  SimpleHelperReference,
  ClassBasedHelperReference
} from './utils/references';

import { default as concat } from './helpers/concat';
import {
  inlineIf,
  inlineUnless
} from './helpers/if-unless';

import { default as action } from './helpers/action';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { default as loc } from './helpers/loc';
import { default as log } from './helpers/log';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import { default as classHelper } from './helpers/-class';
import { default as queryParams } from './helpers/query-param';
import { OWNER } from 'container/owner';

const builtInComponents = {
  textarea: '-text-area'
};

const builtInHelpers = {
  concat,
  if: inlineIf,
  unless: inlineUnless,
  action,
  get,
  hash,
  loc,
  log,
  readonly,
  unbound,
  'query-params': queryParams,
  '-class': classHelper
};

import { default as ActionModifierManager } from './modifiers/action';

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

function wrapClassBindingAttribute(args) {
  let hasClassBinding = args.named.has('classBinding');

  if (hasClassBinding) {
    let { value , type } = args.named.at('classBinding');
    if (type === 'value') {
      let [ prop, truthy, falsy ] = value.split(':');
      let spec;
      if (prop === '') {
        spec = ['helper', ['-class'], [truthy], null];
      } else if (falsy) {
        let parts = prop.split('.');
        spec = ['helper', ['-class'], [['get', parts], truthy, falsy], null];
      } else if (truthy) {
        let parts = prop.split('.');
        spec = ['helper', ['-class'], [['get', parts], truthy], null];
      }

      if (spec) {
        let syntax;
        if (args.named.has('class')) {
          // If class already exists, merge
          let classValue = args.named.at('class').value;
          syntax = HelperSyntax.fromSpec(['helper', ['concat'], [classValue, ' ', spec]]);
        } else {
          syntax = HelperSyntax.fromSpec(spec);
        }
        args.named.add('class', syntax);
      }
    }
  }
}

export default class Environment extends GlimmerEnvironment {
  static create(options) {
    return new Environment(options);
  }

  constructor({ dom, [OWNER]: owner }) {
    super(dom);
    this.owner = owner;
    this._components = new Dict();
    this.builtInModifiers = {
      action: new ActionModifierManager()
    };
  }

  refineStatement(statement) {
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

    if (key !== 'partial' && isSimple && (isInline || isBlock)) {
      if (key === 'component') {
        return new DynamicComponentSyntax({ args, templates });
      } else if (key === 'outlet') {
        return new OutletSyntax({ args });
      } else if (key.indexOf('-') >= 0) {
        let definition = this.getComponentDefinition(path);
        if (definition) {
          wrapClassBindingAttribute(args);
          wrapClassAttribute(args);
          return new CurlyComponentSyntax({ args, definition, templates });
        }
      } else {
        // Check if it's a keyword
        let mappedKey = builtInComponents[key];
        if (mappedKey) {
          let definition = this.getComponentDefinition([mappedKey]);
          wrapClassBindingAttribute(args);
          wrapClassAttribute(args);
          return new CurlyComponentSyntax({ args, definition, templates });
        }
      }
    }

    let nativeSyntax = super.refineStatement(statement);
    assert(`Helpers may not be used in the block form, for example {{#${key}}}{{/${key}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${key})}}{{/if}}.`, !nativeSyntax && key && this.hasHelper(key) ? !isBlock : true);
    assert(`Helpers may not be used in the element form.`, !nativeSyntax && key && this.hasHelper(key) ? !isModifier : true);
    return nativeSyntax;
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

  rootReferenceFor(value) {
    return new RootReference(value);
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
