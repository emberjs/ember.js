import {
  Environment as GlimmerEnvironment,
  HelperSyntax
} from 'glimmer-runtime';
import Dict from 'ember-metal/empty_object';
import { assert } from 'ember-metal/debug';
import { CurlyComponentSyntax, CurlyComponentDefinition } from './components/curly-component';
import { DynamicComponentSyntax } from './components/dynamic-component';
import { OutletSyntax } from './components/outlet';
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

import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { default as loc } from './helpers/loc';
import { default as log } from './helpers/log';
import { default as classHelper } from './helpers/-class';
import { default as unbound } from './helpers/unbound';
import { OWNER } from 'container/owner';

const builtInHelpers = {
  concat,
  if: inlineIf,
  unless: inlineUnless,
  get,
  hash,
  loc,
  log,
  unbound,
  '-class': classHelper
};

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
  }

  refineStatement(statement) {
    let {
      isSimple,
      isInline,
      isBlock,
      key,
      path,
      args,
      templates
    } = statement;

    if (isSimple && (isInline || isBlock)) {
      if (key === 'component') {
        return new DynamicComponentSyntax({ args, templates });
      } else if (key === 'outlet') {
        return new OutletSyntax({ args });
      } else if (key.indexOf('-') >= 0) {
        let definition = this.getComponentDefinition(path);

        if (definition) {
          wrapClassAttribute(args);
          return new CurlyComponentSyntax({ args, definition, templates });
        }
      }
    }

    let nativeSyntax = super.refineStatement(statement);
    assert(`Helpers may not be used in the block form, for example {{#${key}}}{{/${key}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${key})}}{{/if}}.`, !nativeSyntax && key && this.hasHelper(key) ? !isBlock : true);
    return nativeSyntax;
  }

  hasComponentDefinition() {
    return false;
  }

  getComponentDefinition(name) {
    let definition = this._components[name];

    if (!definition) {
      let { component: ComponentClass, layout } = lookupComponent(this.owner, name[0]);

      if (ComponentClass || layout) {
        definition = this._components[name] = new CurlyComponentDefinition(name, ComponentClass, layout);
      }
    }

    return definition;
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
      return (args) => new SimpleHelperReference(helper.compute, args);
    } else if (helper.isHelperFactory) {
      return (args) => new ClassBasedHelperReference(helper.create(), args);
    } else {
      throw new Error(`${name} is not a helper`);
    }
  }

  rootReferenceFor(value) {
    return new RootReference(value);
  }

  toConditionalReference(reference) {
    // if (isConst(reference)) {
    //   return new ConstConditionalReference(reference);
    // } else {
    //   return new ConditionalReference(reference);
    // }

    // FIXME: fix failing proxy tests
    return new ConditionalReference(reference);
  }

  iterableFor(ref, args) {
    let keyPath = args.named.get('key').value();
    return createIterable(ref, keyPath);
  }
}
