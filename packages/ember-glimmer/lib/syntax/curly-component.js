import { StatementSyntax, ValueReference, EvaluatedArgs, EvaluatedNamedArgs, EvaluatedPositionalArgs } from 'glimmer-runtime';
import { TO_ROOT_REFERENCE } from '../utils/references';
import { AttributeBinding, ClassNameBinding, IsVisibleBinding } from '../utils/bindings';
import { DIRTY_TAG, IS_DISPATCHING_ATTRS, HAS_BLOCK } from '../component';
import { assert, runInDebug } from 'ember-metal/debug';
import processArgs from '../utils/process-args';
import { privatize as P } from 'container/registry';
import assign from 'ember-metal/assign';
import get from 'ember-metal/property_get';
import { ComponentDefinition } from 'glimmer-runtime';
import Component from '../component';

const DEFAULT_LAYOUT = P`template:components/-default`;

export function validatePositionalParameters(named, positional, positionalParamsDefinition) {
  runInDebug(() => {
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
  });
}

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
    let parsed = AttributeBinding.parse(binding);
    let attribute = parsed[1];

    if (seen.indexOf(attribute) === -1) {
      seen.push(attribute);
      AttributeBinding.apply(component, parsed, operations);
    }

    i--;
  }

  if (!seen['style']) {
    IsVisibleBinding.apply(component, operations);
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
  prepareArgs(definition, args) {
    validatePositionalParameters(args.named, args.positional.values, definition.ComponentClass.positionalParams);

    if (definition.args) {
      let newNamed = args.named.map;
      let newPositional = args.positional.values;

      let oldNamed = definition.args.named.map;
      let oldPositional = definition.args.positional.values;

      // Merge positional arrays
      let mergedPositional = [];

      mergedPositional.push(...oldPositional);
      mergedPositional.splice(0, newPositional.length, ...newPositional);

      // Merge named maps
      let mergedNamed = assign({}, oldNamed, newNamed);

      // THOUGHT: It might be nice to have a static method on EvaluatedArgs that
      // can merge two sets of args for us.
      let mergedArgs = EvaluatedArgs.create({
        named: EvaluatedNamedArgs.create({
          map: mergedNamed
        }),
        positional: EvaluatedPositionalArgs.create({
          values: mergedPositional
        })
      });

      // Preserve the invocation args' `internal` storage.
      mergedArgs.internal = args.internal;

      return mergedArgs;
    }

    return args;
  }

  create(definition, args, dynamicScope, hasBlock) {
    let parentView = dynamicScope.view;

    let klass = definition.ComponentClass;
    let processedArgs = processArgs(args, klass.positionalParams);
    let { attrs, props } = processedArgs.value();

    aliasIdToElementId(args, props);

    props.parentView = parentView;
    props.renderer = parentView.renderer;
    props[HAS_BLOCK] = hasBlock;

    // dynamicScope here is inherited from the parent dynamicScope,
    // but is set shortly below to the new target
    props._targetObject = dynamicScope.targetObject;

    let component = klass.create(props);

    dynamicScope.view = component;
    dynamicScope.targetObject = component;

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

  layoutFor(definition, bucket, env) {
    let template = definition.template;
    if (!template) {
      let { component } = bucket;
      template = this.templateFor(component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  templateFor(component, env) {
    let Template = component.layout;
    if (Template) {
      return env.getTemplate(Template);
    }
    let { owner } = env;
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
    return component[TO_ROOT_REFERENCE]();
  }

  didCreateElement({ component, classRef }, element, operations) {
    component.element = element;

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(attributeBindings, component, operations);
    } else {
      IsVisibleBinding.apply(component, operations);
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
        ClassNameBinding.apply(component, binding, operations);
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
      let { attrs, props } = args.value();

      bucket.argsRevision = args.tag.value();

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
  constructor(name, ComponentClass, template, args) {
    super(name, MANAGER, ComponentClass || Component);
    this.template = template;
    this.args = args;
  }
}

class CurlyComponentLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('id', elementId);
    builder.attrs.dynamic('role', ariaRole);
    builder.attrs.static('class', 'ember-view');
  }
}

CurlyComponentLayoutCompiler.id = 'curly';
