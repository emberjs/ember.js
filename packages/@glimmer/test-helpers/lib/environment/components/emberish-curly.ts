import {
  Bounds,
  CapturedNamedArguments,
  ComponentCapabilities,
  Destroyable,
  DynamicScope,
  ElementOperations,
  Environment,
  Invocation,
  ModuleLocator,
  Option,
  PreparedArguments,
  ProgramSymbolTable,
  VMArguments,
  WithAotStaticLayout,
  WithDynamicTagName,
  WithJitDynamicLayout,
  SyntaxCompilationContext,
  Template,
  AotRuntimeResolver,
} from '@glimmer/interfaces';
import GlimmerObject from '@glimmer/object';
import { UpdatableReference, CLASS_META } from '@glimmer/object-reference';
import { combine, DirtyableTag, PathReference, Tag, TagWrapper } from '@glimmer/reference';
import { PrimitiveReference } from '@glimmer/runtime';
import { assign, EMPTY_ARRAY, templateMeta } from '@glimmer/util';
import { TestComponentDefinitionState } from '../components';
import EagerRuntimeResolver from '../modes/eager/runtime-resolver';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import { Attrs, AttrsDiff } from '../shared';

export class EmberishCurlyComponent extends GlimmerObject {
  public static positionalParams: string[] | string = [];

  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public layout!: { name: string; handle: number };
  public name!: string;
  public tagName: Option<string> = null;
  public attributeBindings: Option<string[]> = null;
  public attrs!: Attrs;
  public element!: Element;
  public bounds!: Bounds;
  public parentView: Option<EmberishCurlyComponent> = null;
  public args!: CapturedNamedArguments;

  static create(args: { attrs: Attrs }): EmberishCurlyComponent {
    return super.create(args) as EmberishCurlyComponent;
  }

  recompute() {
    this.dirtinessTag.inner.dirty();
  }

  didInitAttrs(_options: { attrs: Attrs }) {}
  didUpdateAttrs(_diff: AttrsDiff) {}
  didReceiveAttrs(_diff: AttrsDiff) {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

EmberishCurlyComponent[CLASS_META].seal();

export const BaseEmberishCurlyComponent = EmberishCurlyComponent.extend() as typeof EmberishCurlyComponent;

export interface EmberishCurlyComponentFactory {
  fromDynamicScope?: string[];
  positionalParams: Option<string | string[]>;
  create(options: { attrs: Attrs; targetObject: any }): EmberishCurlyComponent;
}

export const CURLY_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true,
  dynamicScope: true,
  createCaller: true,
  updateHook: true,
  createInstance: true,
  wrapped: true,
};

export const EMBERISH_CURLY_CAPABILITIES: ComponentCapabilities = {
  ...CURLY_CAPABILITIES,
  dynamicLayout: false,
  attributeHook: false,
};

export interface EmberishCurlyComponentDefinitionState {
  name: string;
  ComponentClass: EmberishCurlyComponentFactory;
  locator: ModuleLocator;
  layout: Option<number>;
  symbolTable?: ProgramSymbolTable;
}

export class EmberishCurlyComponentManager
  implements
    WithDynamicTagName<EmberishCurlyComponent>,
    WithJitDynamicLayout<EmberishCurlyComponent, LazyRuntimeResolver>,
    WithAotStaticLayout<
      EmberishCurlyComponent,
      EmberishCurlyComponentDefinitionState,
      EagerRuntimeResolver
    > {
  getCapabilities(state: TestComponentDefinitionState) {
    return state.capabilities;
  }

  getAotStaticLayout(
    state: EmberishCurlyComponentDefinitionState,
    resolver: AotRuntimeResolver
  ): Invocation {
    return resolver.getInvocation(templateMeta(state.locator));
  }

  getJitDynamicLayout(
    { layout }: EmberishCurlyComponent,
    resolver: LazyRuntimeResolver,
    { program: { resolverDelegate } }: SyntaxCompilationContext
  ): Template {
    if (!layout) {
      throw new Error('BUG: missing dynamic layout');
    }

    let source = resolver.resolve<string>(layout.handle);

    if (source === null) {
      throw new Error(`BUG: Missing dynamic layout for ${layout.name}`);
    }

    return resolverDelegate.compile(source, layout.name);
  }

  prepareArgs(
    state: EmberishCurlyComponentDefinitionState,
    args: VMArguments
  ): Option<PreparedArguments> {
    const { positionalParams } = state.ComponentClass || BaseEmberishCurlyComponent;

    if (typeof positionalParams === 'string') {
      if (args.named.has(positionalParams)) {
        if (args.positional.length === 0) {
          return null;
        } else {
          throw new Error(
            `You cannot specify positional parameters and the hash argument \`${positionalParams}\`.`
          );
        }
      }

      let named = Object.assign({}, args.named.capture().map);
      named[positionalParams] = args.positional.capture();

      return { positional: EMPTY_ARRAY, named };
    } else if (Array.isArray(positionalParams)) {
      let named = Object.assign({}, args.named.capture().map);
      let count = Math.min(positionalParams.length, args.positional.length);

      for (let i = 0; i < count; i++) {
        let name = positionalParams[i];

        if (named[name]) {
          throw new Error(
            `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`
          );
        }

        named[name] = args.positional.at(i);
      }

      return { positional: EMPTY_ARRAY, named };
    } else {
      return null;
    }
  }

  create(
    _environment: Environment,
    state: EmberishCurlyComponentDefinitionState,
    _args: VMArguments,
    dynamicScope: DynamicScope,
    callerSelf: PathReference<unknown>,
    hasDefaultBlock: boolean
  ): EmberishCurlyComponent {
    let klass = state.ComponentClass || BaseEmberishCurlyComponent;
    let self = callerSelf.value();
    let args = _args.named.capture();
    let attrs = args.value();
    let merged = assign(
      {},
      attrs,
      { attrs },
      { args },
      { targetObject: self },
      { HAS_BLOCK: hasDefaultBlock }
    );
    let component = klass.create(merged);

    component.capabilities = component.name = state.name;
    component.args = args;

    if (state.layout !== null) {
      component.layout = { name: component.name, handle: state.layout };
    }

    let dyn: Option<string[]> = state.ComponentClass
      ? state.ComponentClass['fromDynamicScope'] || null
      : null;

    if (dyn) {
      for (let i = 0; i < dyn.length; i++) {
        let name = dyn[i];
        component.set(name, dynamicScope.get(name).value());
      }
    }

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  getTag({ args: { tag }, dirtinessTag }: EmberishCurlyComponent): Tag {
    return combine([tag, dirtinessTag]);
  }

  getSelf(component: EmberishCurlyComponent): PathReference<unknown> {
    return new UpdatableReference(component);
  }

  getTagName({ tagName }: EmberishCurlyComponent): Option<string> {
    if (tagName) {
      return tagName;
    } else if (tagName === null) {
      return 'div';
    } else {
      return null;
    }
  }

  didCreateElement(
    component: EmberishCurlyComponent,
    element: Element,
    operations: ElementOperations
  ): void {
    component.element = element;

    operations.setAttribute(
      'id',
      PrimitiveReference.create(`ember${component._guid}`),
      false,
      null
    );
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);

    let bindings = component.attributeBindings;
    let rootRef = new UpdatableReference(component);

    if (bindings) {
      for (let i = 0; i < bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.setAttribute(attribute, reference, false, null);
      }
    }
  }

  didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(component: EmberishCurlyComponent): void {
    component.didInsertElement();
    component.didRender();
  }

  update(component: EmberishCurlyComponent): void {
    let oldAttrs = component.attrs;
    let newAttrs = component.args.value();
    let merged = assign({}, newAttrs, { attrs: newAttrs });

    component.setProperties(merged);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout(): void {}

  didUpdate(component: EmberishCurlyComponent): void {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishCurlyComponent): Destroyable {
    return {
      destroy() {
        component.destroy();
      },
    };
  }
}
