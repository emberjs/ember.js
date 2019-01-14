import {
  Bounds,
  CapturedNamedArguments,
  CompilableProgram,
  ComponentCapabilities,
  ComponentManager,
  Destroyable,
  DynamicScope,
  Environment,
  Invocation,
  Option,
  VMArguments,
  WithAotStaticLayout,
  WithJitStaticLayout,
  AotRuntimeResolver,
} from '@glimmer/interfaces';
import GlimmerObject from '@glimmer/object';
import { UpdatableReference } from '@glimmer/object-reference';
import { combine, DirtyableTag, PathReference, Tag, TagWrapper } from '@glimmer/reference';
import { TestComponentDefinitionState } from '../components';
import EagerRuntimeResolver from '../modes/eager/runtime-resolver';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import { Attrs, AttrsDiff } from '../shared';
import { BASIC_CAPABILITIES } from './basic';
import { templateMeta } from '@glimmer/util';

export const EMBERISH_GLIMMER_CAPABILITIES = {
  ...BASIC_CAPABILITIES,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true,
  updateHook: true,
  createInstance: true,
};

export interface EmberishGlimmerComponentState {
  args: CapturedNamedArguments;
  component: EmberishGlimmerComponent;
}

export class EmberishGlimmerComponentManager
  implements
    ComponentManager<EmberishGlimmerComponentState, TestComponentDefinitionState>,
    WithJitStaticLayout<
      EmberishGlimmerComponentState,
      TestComponentDefinitionState,
      LazyRuntimeResolver
    >,
    WithAotStaticLayout<
      EmberishGlimmerComponentState,
      TestComponentDefinitionState,
      EagerRuntimeResolver
    > {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  prepareArgs(): null {
    return null;
  }

  create(
    _environment: Environment,
    definition: TestComponentDefinitionState,
    _args: VMArguments,
    _dynamicScope: DynamicScope,
    _callerSelf: PathReference<unknown>,
    _hasDefaultBlock: boolean
  ): EmberishGlimmerComponentState {
    let args = _args.named.capture();
    let klass = definition.ComponentClass || BaseEmberishGlimmerComponent;
    let attrs = args.value();
    let component = klass.create({ attrs });

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return { args, component };
  }

  getTag({ args: { tag }, component: { dirtinessTag } }: EmberishGlimmerComponentState): Tag {
    return combine([tag, dirtinessTag]);
  }

  getJitStaticLayout(
    state: TestComponentDefinitionState,
    resolver: LazyRuntimeResolver
  ): CompilableProgram {
    return resolver.compilable(templateMeta(state.locator)).asLayout();
  }

  getAotStaticLayout(
    state: TestComponentDefinitionState,
    resolver: AotRuntimeResolver
  ): Invocation {
    let { locator } = state;

    return resolver.getInvocation(templateMeta(locator.meta.locator));
  }

  getSelf({ component }: EmberishGlimmerComponentState): PathReference<unknown> {
    return new UpdatableReference(component);
  }

  didCreateElement(): void {}

  didRenderLayout({ component }: EmberishGlimmerComponentState, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate({ component }: EmberishGlimmerComponentState): void {
    component.didInsertElement();
    component.didRender();
  }

  update({ args, component }: EmberishGlimmerComponentState): void {
    let oldAttrs = component.attrs;
    let newAttrs = args.value();

    component.set('attrs', newAttrs);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout(): void {}

  didUpdate({ component }: EmberishGlimmerComponentState): void {
    component.didUpdate();
    component.didRender();
  }

  getDestructor({ component }: EmberishGlimmerComponentState): Destroyable {
    return {
      destroy() {
        component.destroy();
      },
    };
  }
}

export interface ComponentHooks {
  didInitAttrs: number;
  didUpdateAttrs: number;
  didReceiveAttrs: number;
  willInsertElement: number;
  willUpdate: number;
  willRender: number;
  didInsertElement: number;
  didUpdate: number;
  didRender: number;
}

export interface HookedComponent {
  hooks: ComponentHooks;
}

export class EmberishGlimmerComponent extends GlimmerObject {
  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public attrs!: Attrs;
  public element!: Element;
  public bounds!: Bounds;
  public parentView: Option<EmberishGlimmerComponent> = null;

  static create(args: { attrs: Attrs }): EmberishGlimmerComponent {
    return super.create(args) as EmberishGlimmerComponent;
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

export interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;
