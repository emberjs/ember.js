import { Environment } from 'glimmer-runtime';
import Dict from 'ember-metal/empty_object';
import { CurlyComponentSyntax, CurlyComponentDefinition } from './components/curly-component';
import { DynamicComponentSyntax } from './components/dynamic-component';
import { OutletSyntax } from './components/outlet';
import lookupComponent from './utils/lookup-component';
import createIterable from './utils/iterable';
import { RootReference, ConditionalReference } from './utils/references';

import { default as concat } from './helpers/concat';
import {
  inlineIf,
  inlineUnless
} from './helpers/inline-if-unless';

const helpers = {
  concat,
  if: inlineIf,
  unless: inlineUnless
};

export default class extends Environment {
  constructor({ dom, owner }) {
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
          return new CurlyComponentSyntax({ args, definition, templates });
        }
      }
    }

    return super.refineStatement(statement);
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
    if (typeof helpers[name[0]] === 'function') {
      return true;
    } else {
      return this.owner.hasRegistration(`helper:${name}`);
    }
  }

  lookupHelper(name) {
    if (typeof helpers[name[0]] === 'function') {
      return helpers[name[0]];
    } else {
      let helper = this.owner.lookup(`helper:${name}`);

      if (helper && helper.isHelperInstance) {
        return helper.compute;
      } else if (helper && helper.isHelperFactory) {
        throw new Error(`Not implemented: ${name} is a class-based helpers`);
      } else {
        throw new Error(`${name} is not a helper`);
      }
    }
  }

  rootReferenceFor(value) {
    return new RootReference(value);
  }

  toConditionalReference(reference) {
    return new ConditionalReference(reference);
  }

  iterableFor(ref, args) {
    let keyPath = args.named.get('key').value();
    return createIterable(ref, keyPath);
  }
}
