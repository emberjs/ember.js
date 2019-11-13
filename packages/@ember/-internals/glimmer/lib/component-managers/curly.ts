import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import {
  addChildView,
  OwnedTemplateMeta,
  setElementView,
  setViewElement,
} from '@ember/-internals/views';
import { assert, debugFreeze } from '@ember/debug';
import { EMBER_COMPONENT_IS_VISIBLE } from '@ember/deprecated-features';
import { _instrumentStart } from '@ember/instrumentation';
import { assign } from '@ember/polyfills';
import { DEBUG } from '@glimmer/env';
import {
  ComponentCapabilities,
  Option,
  ProgramSymbolTable,
  VMHandle,
} from '@glimmer/interfaces';
import { combine, Tag, validate, value, VersionedPathReference } from '@glimmer/reference';
import {
  Arguments,
  Bounds,
  ComponentDefinition,
  ElementOperations,
  Invocation,
  PreparedArguments,
  PrimitiveReference,
  WithDynamicLayout,
  WithDynamicTagName,
  WithStaticLayout,
} from '@glimmer/runtime';
import { Destroyable, EMPTY_ARRAY } from '@glimmer/util';
import { SimpleElement } from '@simple-dom/interface';
import { BOUNDS, DIRTY_TAG, HAS_BLOCK, IS_DISPATCHING_ATTRS } from '../component';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import { Factory as TemplateFactory, isTemplateFactory, OwnedTemplate } from '../template';
import {
  AttributeBinding,
  ClassNameBinding,
  IsVisibleBinding,
  referenceForKey,
  SimpleClassNameBindingReference,
} from '../utils/bindings';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import { processComponentArgs } from '../utils/process-args';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import DefinitionState from './definition-state';

function aliasIdToElementId(args: Arguments, props: any) {
  if (args.named.has('id')) {
    // tslint:disable-next-line:max-line-length
    assert(
      `You cannot invoke a component with both 'id' and 'elementId' at the same time.`,
      !args.named.has('elementId')
    );
    props.elementId = props.id;
  }
}

// We must traverse the attributeBindings in reverse keeping track of
// what has already been applied. This is essentially refining the concatenated
// properties applying right to left.
function applyAttributeBindings(
  element: SimpleElement,
  attributeBindings: Array<string>,
  component: Component,
  rootRef: RootReference<Component>,
  operations: ElementOperations
) {
  let seen: string[] = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    let parsed: [string, string, boolean] = AttributeBinding.parse(binding);
    let attribute = parsed[1];

    if (seen.indexOf(attribute) === -1) {
      seen.push(attribute);
      AttributeBinding.install(element, component, rootRef, parsed, operations);
    }

    i--;
  }

  if (seen.indexOf('id') === -1) {
    let id = component.elementId ? component.elementId : guidFor(component);
    operations.setAttribute('id', PrimitiveReference.create(id), false, null);
  }

  if (
    EMBER_COMPONENT_IS_VISIBLE &&
    IsVisibleBinding !== undefined &&
    seen.indexOf('style') === -1
  ) {
    IsVisibleBinding.install(element, component, rootRef, operations);
  }
}

const DEFAULT_LAYOUT = P`template:components/-default`;
const EMPTY_POSITIONAL_ARGS: VersionedPathReference[] = [];

debugFreeze(EMPTY_POSITIONAL_ARGS);

export default class CurlyComponentManager
  extends AbstractManager<ComponentStateBucket, DefinitionState>
  implements
    WithStaticLayout<ComponentStateBucket, DefinitionState, OwnedTemplateMeta, RuntimeResolver>,
    WithDynamicTagName<ComponentStateBucket>,
    WithDynamicLayout<ComponentStateBucket, OwnedTemplateMeta, RuntimeResolver> {
  getLayout(state: DefinitionState, _resolver: RuntimeResolver): Invocation {
    return {
      // TODO fix
      handle: (state.handle as any) as number,
      symbolTable: state.symbolTable!,
    };
  }

  protected templateFor(component: Component): OwnedTemplate {
    let { layout, layoutName } = component;
    let owner = getOwner(component);

    let factory: TemplateFactory;

    if (layout === undefined) {
      if (layoutName !== undefined) {
        let _factory = owner.lookup<TemplateFactory>(`template:${layoutName}`);
        assert(`Layout \`${layoutName}\` not found!`, _factory !== undefined);
        factory = _factory!;
      } else {
        factory = owner.lookup<TemplateFactory>(DEFAULT_LAYOUT)!;
      }
    } else if (isTemplateFactory(layout)) {
      factory = layout;
    } else {
      // we were provided an instance already
      return layout;
    }

    return factory(owner);
  }

  getDynamicLayout(bucket: ComponentStateBucket): Invocation {
    let component = bucket.component;
    let template = this.templateFor(component);
    let layout = template.asWrappedLayout();

    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.debugRenderTree.setTemplate(bucket, template);
    }

    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  getTagName(state: ComponentStateBucket): Option<string> {
    let { component, hasWrappedElement } = state;

    if (!hasWrappedElement) {
      return null;
    }

    return (component && component.tagName) || 'div';
  }

  getCapabilities(state: DefinitionState) {
    return state.capabilities;
  }

  prepareArgs(state: DefinitionState, args: Arguments): Option<PreparedArguments> {
    if (args.named.has('__ARGS__')) {
      let { __ARGS__, ...rest } = args.named.capture().map;

      let prepared = {
        positional: EMPTY_POSITIONAL_ARGS,
        named: {
          ...rest,
          ...__ARGS__.value(),
        },
      };

      return prepared;
    }

    const { positionalParams } = state.ComponentClass.class!;

    // early exits
    if (
      positionalParams === undefined ||
      positionalParams === null ||
      args.positional.length === 0
    ) {
      return null;
    }

    let named: PreparedArguments['named'];

    if (typeof positionalParams === 'string') {
      assert(
        `You cannot specify positional parameters and the hash argument \`${positionalParams}\`.`,
        !args.named.has(positionalParams)
      );
      named = { [positionalParams]: args.positional.capture() };
      assign(named, args.named.capture().map);
    } else if (Array.isArray(positionalParams) && positionalParams.length > 0) {
      const count = Math.min(positionalParams.length, args.positional.length);
      named = {};
      assign(named, args.named.capture().map);

      for (let i = 0; i < count; i++) {
        const name = positionalParams[i];

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !args.named.has(name)
        );

        named[name] = args.positional.at(i);
      }
    } else {
      return null;
    }

    return { positional: EMPTY_ARRAY, named };
  }

  /*
   * This hook is responsible for actually instantiating the component instance.
   * It also is where we perform additional bookkeeping to support legacy
   * features like exposed by view mixins like ChildViewSupport, ActionSupport,
   * etc.
   */
  create(
    environment: Environment,
    state: DefinitionState,
    args: Arguments,
    dynamicScope: DynamicScope,
    callerSelfRef: VersionedPathReference,
    hasBlock: boolean
  ): ComponentStateBucket {
    // Get the nearest concrete component instance from the scope. "Virtual"
    // components will be skipped.
    let parentView = dynamicScope.view;

    // Get the Ember.Component subclass to instantiate for this component.
    let factory = state.ComponentClass;

    // Capture the arguments, which tells Glimmer to give us our own, stable
    // copy of the Arguments object that is safe to hold on to between renders.
    let capturedArgs = args.named.capture();
    let props = processComponentArgs(capturedArgs);

    // Alias `id` argument to `elementId` property on the component instance.
    aliasIdToElementId(args, props);

    // Set component instance's parentView property to point to nearest concrete
    // component.
    props.parentView = parentView;

    // Set whether this component was invoked with a block
    // (`{{#my-component}}{{/my-component}}`) or without one
    // (`{{my-component}}`).
    props[HAS_BLOCK] = hasBlock;

    // Save the current `this` context of the template as the component's
    // `_target`, so bubbled actions are routed to the right place.
    props._target = callerSelfRef.value();

    // static layout asserts CurriedDefinition
    if (state.template) {
      props.layout = state.template;
    }

    // caller:
    // <FaIcon @name="bug" />
    //
    // callee:
    // <i class="fa-{{@name}}"></i>

    // Now that we've built up all of the properties to set on the component instance,
    // actually create it.
    let component = factory.create(props);

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    // We become the new parentView for downstream components, so save our
    // component off on the dynamic scope.
    dynamicScope.view = component;

    // Unless we're the root component, we need to add ourselves to our parent
    // component's childViews array.
    if (parentView !== null && parentView !== undefined) {
      addChildView(parentView, component);
    }

    component.trigger('didReceiveAttrs');

    let hasWrappedElement = component.tagName !== '';

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (!hasWrappedElement) {
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    // Track additional lifecycle metadata about this component in a state bucket.
    // Essentially we're saving off all the state we'll need in the future.
    let bucket = new ComponentStateBucket(
      environment,
      component,
      capturedArgs,
      finalizer,
      hasWrappedElement
    );

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    if (DEBUG) {
      processComponentInitializationAssertions(component, props);
    }

    if (environment.isInteractive && hasWrappedElement) {
      component.trigger('willRender');
    }

    if (ENV._DEBUG_RENDER_TREE) {
      environment.debugRenderTree.create(bucket, {
        type: 'component',
        name: state.name,
        args: args.capture(),
        instance: component,
        template: state.template,
      });
    }

    return bucket;
  }

  getSelf({ rootRef }: ComponentStateBucket): VersionedPathReference {
    return rootRef;
  }

  didCreateElement(
    { component, classRef, environment, rootRef }: ComponentStateBucket,
    element: SimpleElement,
    operations: ElementOperations
  ): void {
    setViewElement(component, element);
    setElementView(element, component);

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(element, attributeBindings, component, rootRef, operations);
    } else {
      let id = component.elementId ? component.elementId : guidFor(component);
      operations.setAttribute('id', PrimitiveReference.create(id), false, null);
      if (EMBER_COMPONENT_IS_VISIBLE && IsVisibleBinding !== undefined) {
        IsVisibleBinding.install(element, component, rootRef, operations);
      }
    }

    if (classRef) {
      const ref = new SimpleClassNameBindingReference(classRef, classRef['propertyKey']);
      operations.setAttribute('class', ref, false, null);
    }

    if (classNames && classNames.length) {
      classNames.forEach((name: string) => {
        operations.setAttribute('class', PrimitiveReference.create(name), false, null);
      });
    }

    if (classNameBindings && classNameBindings.length) {
      classNameBindings.forEach((binding: string) => {
        ClassNameBinding.install(element, rootRef, binding, operations);
      });
    }
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);

    if ('ariaRole' in component) {
      operations.setAttribute('role', referenceForKey(rootRef, 'ariaRole'), false, null);
    }

    component._transitionTo('hasElement');

    if (environment.isInteractive) {
      component.trigger('willInsertElement');
    }
  }

  didRenderLayout(bucket: ComponentStateBucket, bounds: Bounds): void {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();

    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.debugRenderTree.didRender(bucket, bounds);
    }
  }

  getTag({ args, component }: ComponentStateBucket): Tag {
    return args ? combine([args.tag, component[DIRTY_TAG]]) : component[DIRTY_TAG];
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

    if (ENV._DEBUG_RENDER_TREE) {
      environment.debugRenderTree.update(bucket);
    }

    bucket.finalizer = _instrumentStart('render.component', rerenderInstrumentDetails, component);

    if (args && !validate(args.tag, argsRevision)) {
      let props = processComponentArgs(args!);

      bucket.argsRevision = value(args!.tag);

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

  didUpdateLayout(bucket: ComponentStateBucket, bounds: Bounds): void {
    bucket.finalize();

    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.debugRenderTree.didRender(bucket, bounds);
    }
  }

  didUpdate({ component, environment }: ComponentStateBucket): void {
    if (environment.isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestructor(bucket: ComponentStateBucket): Option<Destroyable> {
    if (ENV._DEBUG_RENDER_TREE) {
      return {
        destroy() {
          bucket.environment.debugRenderTree.willDestroy(bucket);
          bucket.destroy();
        },
      };
    } else {
      return bucket;
    }
  }
}

export function validatePositionalParameters(
  named: { has(name: string): boolean },
  positional: { length: number },
  positionalParamsDefinition: any
) {
  if (DEBUG) {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      // tslint:disable-next-line:max-line-length
      assert(
        `You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`,
        !named.has(positionalParamsDefinition)
      );
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

export function processComponentInitializationAssertions(component: Component, props: any) {
  assert(
    `classNameBindings must be non-empty strings: ${component}`,
    (() => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];

        if (typeof binding !== 'string' || binding.length === 0) {
          return false;
        }
      }
      return true;
    })()
  );

  assert(
    `classNameBindings must not have spaces in them: ${component}`,
    (() => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];
        if (binding.split(' ').length > 1) {
          return false;
        }
      }
      return true;
    })()
  );

  assert(
    `You cannot use \`classNameBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      !component.classNameBindings ||
      component.classNameBindings.length === 0
  );

  assert(
    `You cannot use \`elementId\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      props.id === component.elementId ||
      (!component.elementId && component.elementId !== '')
  );

  assert(
    `You cannot use \`attributeBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      !component.attributeBindings ||
      component.attributeBindings.length === 0
  );
}

export function initialRenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: true });
}

export function rerenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: false });
}

// This is not any of glimmer-vm's proper Argument types because we
// don't have sufficient public constructors to conveniently
// reassemble one after we mangle the various arguments.
interface CurriedArgs {
  positional: any[];
  named: any;
}

export const CURLY_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
};

const CURLY_COMPONENT_MANAGER = new CurlyComponentManager();
export class CurlyComponentDefinition implements ComponentDefinition {
  public args: CurriedArgs | undefined;
  public state: DefinitionState;
  public symbolTable: ProgramSymbolTable | undefined;
  public manager: CurlyComponentManager = CURLY_COMPONENT_MANAGER;
  // tslint:disable-next-line:no-shadowed-variable
  constructor(
    public name: string,
    public ComponentClass: any,
    public handle: Option<VMHandle>,
    public template: Option<OwnedTemplate>,
    args?: CurriedArgs
  ) {
    const layout = template && template.asLayout();
    const symbolTable = layout ? layout.symbolTable : undefined;
    this.symbolTable = symbolTable;
    this.template = template;
    this.args = args;
    this.state = {
      name,
      ComponentClass,
      handle,
      template,
      capabilities: CURLY_CAPABILITIES,
      symbolTable,
    };
  }
}
