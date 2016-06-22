import { StatementSyntax, ValueReference } from 'glimmer-runtime';
import { TO_ROOT_REFERENCE, AttributeBindingReference, applyClassNameBinding } from '../utils/references';
import { DIRTY_TAG, IS_DISPATCHING_ATTRS, HAS_BLOCK } from '../component';
import { assert } from 'ember-metal/debug';
import processArgs from '../utils/process-args';
import { getOwner } from 'container/owner';
import { privatize as P } from 'container/registry';
import get from 'ember-metal/property_get';

const DEFAULT_LAYOUT = P`template:components/-default`;

function aliasIdToElementId(args, props) {
  if (args.named.has('id')) {
    assert(`You cannot invoke a component with both 'id' and 'elementId' at the same time.`, !args.named.has('elementId'));
    props.elementId = props.id;
  }
}

// We must traverse the attributeBindings in reverse keeping track of
// what has already been applied. This is essentially refining the concated
// properties applying right to left.
function applyAttributeBindings(attributeBindings, component, operations) {
  let seen = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    let parsedMicroSyntax = AttributeBindingReference.parseMicroSyntax(binding);
    let [ prop ] = parsedMicroSyntax;

    if (seen.indexOf(prop) === -1) {
      seen.push(prop);
      AttributeBindingReference.apply(component, parsedMicroSyntax, operations);
    }

    i--;
  }
}

// Use `_targetObject` to avoid stomping on a CP
// that exists in the component
function privatizeTargetObject(props) {
  if (props.targetObject) {
    props._targetObject = props.targetObject;
    props.targetObject = undefined;
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
  create(definition, args, dynamicScope, hasBlock) {
    let parentView = dynamicScope.view;

    let klass = definition.ComponentClass;
    let processedArgs = processArgs(args, klass.positionalParams);
    let { attrs, props } = processedArgs.value();

    aliasIdToElementId(args, props);
    privatizeTargetObject(props);

    props.renderer = parentView.renderer;
    props[HAS_BLOCK] = hasBlock;

    let component = klass.create(props);

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

    assert(`classNameBindings must not have spaces in them: ${component.toString()}`, (() => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];
        if (binding.split(' ').length > 1) {
          return false;
        }
      }
      return true;
    })());

    assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), (() => {
      let { classNameBindings, tagName } = component;
      return tagName !== '' || !classNameBindings || classNameBindings.length === 0;
    })());

    assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), (() => {
      let { elementId, tagName } = component;
      return tagName !== '' || (!elementId && elementId !== '');
    })());

    assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), (() => {
      let { attributeBindings, tagName } = component;
      return tagName !== '' || !attributeBindings || attributeBindings.length === 0;
    })());

    return bucket;
  }

  ensureCompilable(definition, bucket, env) {
    if (definition.template) {
      return definition;
    }

    let { component } = bucket;
    let template;
    let TemplateFactory = component.layout;
    // seen the definition but not the template
    if (TemplateFactory) {
      if (env._templateCache[TemplateFactory.id]) {
        template = env._templateCache[TemplateFactory.id];
      } else {
        template = new TemplateFactory(env);
        env._templateCache[TemplateFactory.id] = template;
      }
    } else {
      let layoutName = component.layoutName && get(component, 'layoutName');
      let owner = getOwner(component);

      if (layoutName) {
        template = owner.lookup('template:' + layoutName);
      }
      if (!template) {
        template = owner.lookup(DEFAULT_LAYOUT);
      }
    }

    return definition.lateBound(template);
  }

  getSelf({ component }) {
    return component[TO_ROOT_REFERENCE]();
  }

  didCreateElement({ component, classRef }, element, operations) {
    component.element = element;

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(attributeBindings, component, operations);
    }

    if (classRef) {
      operations.addAttribute('class', classRef);
    }

    if (classNames && classNames.length) {
      classNames.forEach(name => {
        operations.addAttribute('class', new ValueReference(name));
      });
    }

    if (classNameBindings && classNameBindings.length) {
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
      privatizeTargetObject(props);

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

function ariaRole(vm) {
  return vm.getSelf().get('ariaRole');
}

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template) {
    super(name, MANAGER, ComponentClass || Component);
    this.template = template;
    this._cache = undefined;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('id', elementId);
    builder.attrs.dynamic('role', ariaRole);
    builder.attrs.static('class', 'ember-view');
  }

  lateBound(template) {
    let definition;
    if (this._cache) {
      definition = this._cache[template.id];
    } else {
      this._cache = {};
    }
    if (!definition) {
      definition = new CurlyComponentDefinition(this.name, this.ComponentClass, template);
      this._cache[template.id] = definition;
    }
    return definition;
  }
}
