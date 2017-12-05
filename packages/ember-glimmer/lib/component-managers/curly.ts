import { Option } from '@glimmer/interfaces';
import {
  combineTagged,
  Tag,
  VersionedPathReference,
} from '@glimmer/reference';
import {
  Arguments,
  Bounds,
  CompiledDynamicProgram,
  ComponentClass,
  ComponentDefinition,
  ComponentManager,
  ElementOperations,
  NamedArguments,
  PositionalArguments,
  PreparedArguments,
  PrimitiveReference,
  Simple,
  VM,
} from '@glimmer/runtime';
import { Destroyable, Opaque } from '@glimmer/util';
import { privatize as P } from 'container';
import {
  assert,
} from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  _instrumentStart,
  get,
} from 'ember-metal';
import {
  assign,
  OWNER,
} from 'ember-utils';
import { setViewElement } from 'ember-views';
import {
  BOUNDS,
  DIRTY_TAG,
  HAS_BLOCK,
  IS_DISPATCHING_ATTRS,
  ROOT_REF,
} from '../component';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { OwnedTemplate, WrappedTemplateFactory } from '../template';
import {
  AttributeBinding,
  ClassNameBinding,
  IsVisibleBinding,
} from '../utils/bindings';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import { processComponentArgs } from '../utils/process-args';
import { PropertyReference } from '../utils/references';
import AbstractManager from './abstract';

const DEFAULT_LAYOUT = P`template:components/-default`;

function aliasIdToElementId(args: Arguments, props: any) {
  if (args.named.has('id')) {
    // tslint:disable-next-line:max-line-length
    assert(`You cannot invoke a component with both 'id' and 'elementId' at the same time.`, !args.named.has('elementId'));
    props.elementId = props.id;
  }
}

// We must traverse the attributeBindings in reverse keeping track of
// what has already been applied. This is essentially refining the concatenated
// properties applying right to left.
function applyAttributeBindings(element: Simple.Element, attributeBindings: any, component: Component, operations: ElementOperations) {
  let seen: string[] = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    let parsed: [string, string, boolean] = AttributeBinding.parse(binding);
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

function tagName(vm: VM) {
  let dynamicScope: DynamicScope = vm.dynamicScope() as DynamicScope;
  // tslint:disable-next-line:no-shadowed-variable
  let { tagName } = dynamicScope.view!;
  return PrimitiveReference.create(tagName === '' ? null : tagName || 'div');
}

function ariaRole(vm: VM) {
  return vm.getSelf().get('ariaRole');
}

class CurlyComponentLayoutCompiler {
  static id: string;
  public template: WrappedTemplateFactory;

  constructor(template: WrappedTemplateFactory) {
    this.template = template;
  }

  compile(builder: any) {
    builder.wrapLayout(this.template);
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('role', ariaRole);
    builder.attrs.static('class', 'ember-view');
  }
}

CurlyComponentLayoutCompiler.id = 'curly';

export class PositionalArgumentReference {
  public tag: any;
  private _references: any;

  constructor(references: any) {
    this.tag = combineTagged(references);
    this._references = references;
  }

  value() {
    return this._references.map((reference: any) => reference.value());
  }

  get(key: string) {
    return PropertyReference.create(this, key);
  }
}

export default class CurlyComponentManager extends AbstractManager<ComponentStateBucket> {
  prepareArgs(definition: CurlyComponentDefinition, args: Arguments): Option<PreparedArguments> {
    let componentPositionalParamsDefinition = definition.ComponentClass.class.positionalParams;

    if (DEBUG && componentPositionalParamsDefinition) {
      validatePositionalParameters(args.named, args.positional, componentPositionalParamsDefinition);
    }

    let componentHasRestStylePositionalParams = typeof componentPositionalParamsDefinition === 'string';
    let componentHasPositionalParams = componentHasRestStylePositionalParams ||
                                       componentPositionalParamsDefinition.length > 0;
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
        [componentPositionalParamsDefinition]: new PositionalArgumentReference(positional),
      };
      positional = [];
    } else if (componentHasPositionalParams) {
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

  create(environment: Environment, definition: CurlyComponentDefinition, args: Arguments, dynamicScope: DynamicScope, callerSelfRef: VersionedPathReference<Opaque>, hasBlock: boolean): ComponentStateBucket {
    if (DEBUG) {
      this._pushToDebugStack(`component:${definition.name}`, environment);
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

    if (parentView !== null && parentView !== undefined) {
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

  layoutFor(definition: CurlyComponentDefinition, bucket: ComponentStateBucket, env: Environment): CompiledDynamicProgram {
    let template = definition.template;
    if (!template) {
      template = this.templateFor(bucket.component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  templateFor(component: Component, env: Environment): OwnedTemplate {
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

  getSelf({ component }: ComponentStateBucket): VersionedPathReference<Opaque> {
    return component[ROOT_REF];
  }

  didCreateElement({ component, classRef, environment }: ComponentStateBucket, element: Element, operations: ElementOperations): void {
    setViewElement(component, element);

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(element, attributeBindings, component, operations);
    } else {
      operations.addStaticAttribute(element, 'id', component.elementId);
      IsVisibleBinding.install(element, component, operations);
    }

    if (classRef) {
      // TODO should make addDynamicAttribute accept an opaque
      operations.addDynamicAttribute(element, 'class', classRef as any, false);
    }

    if (classNames && classNames.length) {
      classNames.forEach((name: string) => {
        operations.addStaticAttribute(element, 'class', name);
      });
    }

    if (classNameBindings && classNameBindings.length) {
      classNameBindings.forEach((binding: any) => {
        ClassNameBinding.install(element, component, binding, operations);
      });
    }

    component._transitionTo('hasElement');

    if (environment.isInteractive) {
      component.trigger('willInsertElement');
    }
  }

  didRenderLayout(bucket: ComponentStateBucket, bounds: Bounds): void {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  getTag({ component }: ComponentStateBucket): Option<Tag> {
    return component[DIRTY_TAG];
  }

  didCreate({ component, environment }: ComponentStateBucket): void {
    if (environment.isInteractive) {
      component._transitionTo('inDOM');
      component.trigger('didInsertElement');
      component.trigger('didRender');
    }
  }

  update(bucket: ComponentStateBucket): void {
    let { component, args, argsRevision, environment } = bucket;

    if (DEBUG) {
       this._pushToDebugStack(component._debugContainerKey, environment);
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

  didUpdateLayout(bucket: ComponentStateBucket): void {
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  didUpdate({ component, environment }: ComponentStateBucket): void {
    if (environment.isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestructor(stateBucket: ComponentStateBucket): Option<Destroyable> {
    return stateBucket;
  }
}

export function validatePositionalParameters(named: NamedArguments, positional: PositionalArguments, positionalParamsDefinition: any) {
  if (DEBUG) {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      // tslint:disable-next-line:max-line-length
      assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !named.has(positionalParamsDefinition));
    } else {
      if (positional.length < positionalParamsDefinition.length) {
        positionalParamsDefinition = positionalParamsDefinition.slice(0, positional.length);
      }

      for (let i = 0; i < positionalParamsDefinition.length; i++) {
        let name = positionalParamsDefinition[i];

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !named.has(name),
        );
      }
    }
  }
}

export function processComponentInitializationAssertions(component: Component, props: any) {
  assert(`classNameBindings must be strings: ${component}`, (() => {
    let { classNameBindings } = component;
    for (let i = 0; i < classNameBindings.length; i++) {
      let binding = classNameBindings[i];

      if (typeof binding !== 'string') {
        return false;
      }
    }
    return true;
  })());

  assert(`classNameBindings must not have spaces in them: ${component}`, (() => {
    let { classNameBindings } = component;
    for (let i = 0; i < classNameBindings.length; i++) {
      let binding = classNameBindings[i];
      if (binding.split(' ').length > 1) {
        return false;
      }
    }
    return true;
  })());

  assert(`You cannot use \`classNameBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' || !component.classNameBindings || component.classNameBindings.length === 0);

  assert(`You cannot use \`elementId\` on a tag-less component: ${component}`,
    component.tagName !== '' || props.id === component.elementId ||
    (!component.elementId && component.elementId !== ''));

  assert(`You cannot use \`attributeBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' || !component.attributeBindings || component.attributeBindings.length === 0);
}

export function initialRenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: true });
}

export function rerenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: false });
}

const MANAGER = new CurlyComponentManager();

export class CurlyComponentDefinition extends ComponentDefinition<ComponentStateBucket> {
  public template: OwnedTemplate;
  public args: Arguments | undefined;

  // tslint:disable-next-line:no-shadowed-variable
  constructor(name: string, ComponentClass: ComponentClass, template: OwnedTemplate, args: Arguments | undefined, customManager?: ComponentManager<ComponentStateBucket>) {
    super(name, customManager || MANAGER, ComponentClass);
    this.template = template;
    this.args = args;
  }
}
