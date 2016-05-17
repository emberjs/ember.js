import { StatementSyntax, ValueReference } from 'glimmer-runtime';
import { AttributeBindingReference, RootReference, applyClassNameBinding } from '../utils/references';
import { DIRTY_TAG, IS_DISPATCHING_ATTRS, HAS_BLOCK } from '../component';
import { assert } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import { meta as metaFor } from 'ember-metal/meta';
import { watchKey } from 'ember-metal/watch_key';
import processArgs from '../utils/process-args';

function aliasIdToElementId(args, props) {
  if (args.named.has('id')) {
    assert(`You cannot invoke a component with both 'id' and 'elementId' at the same time.`, !args.named.has('elementId'));
    props.elementId = props.id;
  }
}

export class CurlyComponentSyntax extends StatementSyntax {
  constructor({ args, definition, templates }) {
    super();
    this.args = args;
    this.definition = definition;
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.static(this);
  }
}

class ComponentStateBucket {
  constructor(component, args) {
    this.component = component;
    this.classRef = null;
    this.args = args;
    this.argsRevision = args.tag.value();
  }
}

class CurlyComponentManager {
  create(definition, args, dynamicScope) {
    let parentView = dynamicScope.view;

    let klass = definition.ComponentClass;
    let processedArgs = processArgs(args, klass.positionalParams);
    let { attrs, props } = processedArgs.value();

    aliasIdToElementId(args, props);

    props.renderer = parentView.renderer;
    props[HAS_BLOCK] = definition.isBlock;

    let component = klass.create(props);

    if (isEnabled('mandatory-setter')) {
      let meta = metaFor(component);
      let keys = Object.keys(props);

      for (let i = 0; i < keys.length; i++) {
        // Watching a key triggers Ember to install the mandatory setter
        watchKey(component, keys[i], meta);
      }
    }

    dynamicScope.view = component;
    parentView.appendChild(component);

    component.trigger('didInitAttrs', { attrs });
    component.trigger('didReceiveAttrs', { newAttrs: attrs });
    component.trigger('willInsertElement');
    component.trigger('willRender');

    let bucket = new ComponentStateBucket(component, processedArgs);

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    assert('classNameBindings must not have spaces in them', () => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];
        if (binding.split(' ').length > 1) {
          return false;
        }
      }
      return true;
    });

    assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), () => {
      let { classNameBindings, tagName } = component;
      return tagName || !classNameBindings || classNameBindings.length === 0;
    });

    assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), () => {
      let { elementId, tagName } = component;
      return tagName || (!elementId && elementId !== '');
    });

    assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), () => {
      let { attributeBindings, tagName } = component;
      return tagName || !attributeBindings || attributeBindings.length === 0;
    });

    return bucket;
  }

  getSelf({ component }) {
    return new RootReference(component);
  }

  didCreateElement({ component, classRef }, element, operations) {
    component.element = element;

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings) {
      attributeBindings.forEach(binding => {
        AttributeBindingReference.apply(component, binding, operations);
      });
    }

    if (classRef) {
      operations.addAttribute('class', classRef);
    }

    if (classNames) {
      classNames.forEach(name => {
        operations.addAttribute('class', new ValueReference(name));
      });
    }

    if (classNameBindings) {
      classNameBindings.forEach(binding => {
        applyClassNameBinding(component, binding, operations);
      });
    }

    component._transitionTo('hasElement');
  }

  getTag({ component }) {
    return component[DIRTY_TAG];
  }

  didCreate({ component }) {
    component.trigger('didInsertElement');
    component.trigger('didRender');
    component._transitionTo('inDOM');
  }

  update(bucket, _, dynamicScope) {
    let { component, args, argsRevision } = bucket;

    if (!args.tag.validate(argsRevision)) {
      bucket.argsRevision = args.tag.value();

      let { attrs, props } = args.value();

      let oldAttrs = component.attrs;
      let newAttrs = attrs;

      component[IS_DISPATCHING_ATTRS] = true;
      component.setProperties(props);
      component[IS_DISPATCHING_ATTRS] = false;

      component.trigger('didUpdateAttrs', { oldAttrs, newAttrs });
      component.trigger('didReceiveAttrs', { oldAttrs, newAttrs });
    }

    component.trigger('willUpdate');
    component.trigger('willRender');
  }

  didUpdate({ component }) {
    component.trigger('didUpdate');
    component.trigger('didRender');
  }

  getDestructor({ component }) {
    return component;
  }
}

const MANAGER = new CurlyComponentManager();

import { ComponentDefinition } from 'glimmer-runtime';
import Component from '../component';

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  return new ValueReference(tagName === '' ? null : tagName || 'div');
}

function elementId(vm) {
  let component = vm.dynamicScope().view;
  return new ValueReference(component.elementId);
}

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template, isBlock) {
    super(name, MANAGER, ComponentClass || Component);
    this.template = template;
    this.isBlock = isBlock;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('id', elementId);
    builder.attrs.static('class', 'ember-view');
  }
}
