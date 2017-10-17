import { OWNER, assign } from 'ember-utils';
import { combineTagged } from '@glimmer/reference';
import {
  PrimitiveReference,
  ComponentDefinition
} from '@glimmer/runtime';
import {
  assert
} from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  ROOT_REF,
  DIRTY_TAG,
  IS_DISPATCHING_ATTRS,
  HAS_BLOCK,
  BOUNDS
} from '../component';
import {
  AttributeBinding,
  ClassNameBinding,
  IsVisibleBinding
} from '../utils/bindings';
import {
  get,
  _instrumentStart
} from 'ember-metal';
import { processComponentArgs } from '../utils/process-args';
import { setViewElement } from 'ember-views';
import { privatize as P } from 'container';
import AbstractManager from './abstract';
import ComponentStateBucket from '../utils/curly-component-state-bucket';
import { PropertyReference } from '../utils/references';

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
function applyAttributeBindings(element, attributeBindings, component, operations) {
  let seen = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    let parsed = AttributeBinding.parse(binding);
    let attribute = parsed[1];

    if (seen.indexOf(attribute) === -1) {
      seen.push(attribute);
      AttributeBinding.install(element, component, parsed, operations);
    }

    i--;
  }

  if (seen.indexOf('id') === -1) {
    operations.addStaticAttribute(element, 'id', component.elementId);
  }

  if (seen.indexOf('style') === -1) {
    IsVisibleBinding.install(element, component, operations);
  }
}

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  return PrimitiveReference.create(tagName === '' ? null : tagName || 'div');
}

function ariaRole(vm) {
  return vm.getSelf().get('ariaRole');
}

class CurlyComponentLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template);
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('role', ariaRole);
    builder.attrs.static('class', 'ember-view');
  }
}

CurlyComponentLayoutCompiler.id = 'curly';

export class PositionalArgumentReference {
  constructor(references) {
    this.tag = combineTagged(references);
    this._references = references;
  }

  value() {
    return this._references.map(reference => reference.value());
  }

  get(key) {
    return PropertyReference.create(this, key);
  }
}

export default class CurlyComponentManager extends AbstractManager {
  prepareArgs(definition, args) {
    let componentPositionalParamsDefinition = definition.ComponentClass.class.positionalParams;

    if (DEBUG && componentPositionalParamsDefinition) {
      validatePositionalParameters(args.named, args.positional, componentPositionalParamsDefinition);
    }

    let componentHasRestStylePositionalParams = typeof componentPositionalParamsDefinition === 'string';
    let componentHasPositionalParams = componentHasRestStylePositionalParams || componentPositionalParamsDefinition.length > 0;
    let needsPositionalParamMunging = componentHasPositionalParams && args.positional.length !== 0;
    let isClosureComponent = definition.args;

    if (!needsPositionalParamMunging && !isClosureComponent) {
      return null;
    }

    let capturedArgs = args.capture();
    // grab raw positional references array
    let positional = capturedArgs.positional.references;

    // handle prep for closure component with positional params
    let curriedNamed;
    if (definition.args) {
      let remainingDefinitionPositionals = definition.args.positional.slice(positional.length);
      positional = positional.concat(remainingDefinitionPositionals);
      curriedNamed = definition.args.named;
    }

    // handle positionalParams
    let positionalParamsToNamed;
    if (componentHasRestStylePositionalParams) {
      positionalParamsToNamed = {
        [componentPositionalParamsDefinition]: new PositionalArgumentReference(positional)
      };
      positional = [];
    } else if (componentHasPositionalParams){
      positionalParamsToNamed = {};
      let length = Math.min(positional.length, componentPositionalParamsDefinition.length);
      for (let i = 0; i < length; i++) {
        let name = componentPositionalParamsDefinition[i];
        positionalParamsToNamed[name] = positional[i];
      }
    }

    let named = assign({}, curriedNamed, positionalParamsToNamed, capturedArgs.named.map);

    return { positional, named };
  }

  create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock) {
    if (DEBUG) {
      this._pushToDebugStack(`component:${definition.name}`, environment)
    }

    let parentView = dynamicScope.view;

    let factory = definition.ComponentClass;

    let capturedArgs = args.named.capture();
    let props = processComponentArgs(capturedArgs);

    aliasIdToElementId(args, props);

    props.parentView = parentView;
    props[HAS_BLOCK] = hasBlock;

    props._targetObject = callerSelfRef.value();

    let component = factory.create(props);

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    dynamicScope.view = component;

    if (parentView !== null) {
      parentView.appendChild(component);
    }

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (component.tagName === '') {
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    let bucket = new ComponentStateBucket(environment, component, capturedArgs, finalizer);

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    if (DEBUG) {
      processComponentInitializationAssertions(component, props);
    }

    if (environment.isInteractive && component.tagName !== '') {
      component.trigger('willRender');
    }

    return bucket;
  }

  layoutFor(definition, bucket, env) {
    let template = definition.template;
    if (!template) {
      let { component } = bucket;
      template = this.templateFor(component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  templateFor(component, env) {
    let Template = get(component, 'layout');
    let owner = component[OWNER];
    if (Template) {
      return env.getTemplate(Template, owner);
    }
    let layoutName = get(component, 'layoutName');
    if (layoutName) {
      let template = owner.lookup('template:' + layoutName);
      if (template) {
        return template;
      }
    }
    return owner.lookup(DEFAULT_LAYOUT);
  }

  getSelf({ component }) {
    return component[ROOT_REF];
  }

  didCreateElement({ component, classRef, environment }, element, operations) {
    setViewElement(component, element);

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(element, attributeBindings, component, operations);
    } else {
      operations.addStaticAttribute(element, 'id', component.elementId);
      IsVisibleBinding.install(element, component, operations);
    }

    if (classRef) {
      operations.addDynamicAttribute(element, 'class', classRef);
    }

    if (classNames && classNames.length) {
      classNames.forEach(name => {
        operations.addStaticAttribute(element, 'class', name);
      });
    }

    if (classNameBindings && classNameBindings.length) {
      classNameBindings.forEach(binding => {
        ClassNameBinding.install(element, component, binding, operations);
      });
    }

    component._transitionTo('hasElement');

    if (environment.isInteractive) {
      component.trigger('willInsertElement');
    }
  }

  didRenderLayout(bucket, bounds) {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  getTag({ component }) {
    return component[DIRTY_TAG];
  }

  didCreate({ component, environment }) {
    if (environment.isInteractive) {
      component._transitionTo('inDOM');
      component.trigger('didInsertElement');
      component.trigger('didRender');
    }
  }

  update(bucket, _, dynamicScope) {
    let { component, args, argsRevision, environment } = bucket;

    if (DEBUG) {
       this._pushToDebugStack(component._debugContainerKey, environment)
    }

    bucket.finalizer = _instrumentStart('render.component', rerenderInstrumentDetails, component);

    if (!args.tag.validate(argsRevision)) {
      let props = processComponentArgs(args);

      bucket.argsRevision = args.tag.value();

      component[IS_DISPATCHING_ATTRS] = true;
      component.setProperties(props);
      component[IS_DISPATCHING_ATTRS] = false;

      component.trigger('didUpdateAttrs');
      component.trigger('didReceiveAttrs');
    }

    if (environment.isInteractive) {
      component.trigger('willUpdate');
      component.trigger('willRender');
    }
  }

  didUpdateLayout(bucket) {
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  didUpdate({ component, environment }) {
    if (environment.isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestructor(stateBucket) {
    return stateBucket;
  }
}

export function validatePositionalParameters(named, positional, positionalParamsDefinition) {
  if (DEBUG) {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !named.has(positionalParamsDefinition));
    } else {
      if (positional.length < positionalParamsDefinition.length) {
        positionalParamsDefinition = positionalParamsDefinition.slice(0, positional.length);
      }

      for (let i = 0; i < positionalParamsDefinition.length; i++) {
        let name = positionalParamsDefinition[i];

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !named.has(name)
        );
      }
    }
  }
}

export function processComponentInitializationAssertions(component, props) {
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
    return tagName !== '' || props.id === elementId || (!elementId && elementId !== '');
  })());

  assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), (() => {
    let { attributeBindings, tagName } = component;
    return tagName !== '' || !attributeBindings || attributeBindings.length === 0;
  })());
}

export function initialRenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: true });
}

export function rerenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: false });
}

const MANAGER = new CurlyComponentManager();

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template, args, customManager) {
    super(name, customManager || MANAGER, ComponentClass);
    this.template = template;
    this.args = args;
  }
}
