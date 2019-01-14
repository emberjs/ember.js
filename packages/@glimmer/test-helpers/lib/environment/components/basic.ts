import {
  Bounds,
  CompilableProgram,
  ComponentCapabilities,
  Environment,
  Invocation,
  WithAotStaticLayout,
  WithJitStaticLayout,
  AotRuntimeResolver,
} from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { CONSTANT_TAG, PathReference, Tag } from '@glimmer/reference';
import { expect, unreachable, templateMeta } from '@glimmer/util';
import { TestComponentDefinitionState } from '../components';
import EagerRuntimeResolver from '../modes/eager/runtime-resolver';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';

export class BasicComponent {
  public element!: Element;
  public bounds!: Bounds;
}

export interface BasicComponentFactory {
  new (): BasicComponent;
}

export const BASIC_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
};

export class BasicComponentManager
  implements
    WithJitStaticLayout<BasicComponent, TestComponentDefinitionState, LazyRuntimeResolver>,
    WithAotStaticLayout<BasicComponent, TestComponentDefinitionState, EagerRuntimeResolver> {
  getCapabilities(state: TestComponentDefinitionState) {
    return state.capabilities;
  }

  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, definition: TestComponentDefinitionState): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass();
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
    // For the case of dynamically invoking (via `{{component}}`) in eager
    // mode, we need to exchange the module locator for the handle to the
    // compiled layout (which was provided at bundle compilation time and
    // stashed in the component definition state).
    let locator = expect(state.locator, 'component definition state should include module locator');
    return resolver.getInvocation(templateMeta(locator));
  }

  getSelf(component: BasicComponent): PathReference<unknown> {
    return new UpdatableReference(component);
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  didCreateElement(component: BasicComponent, element: Element): void {
    component.element = element;
  }

  didRenderLayout(component: BasicComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(): void {}

  update(): void {}

  didUpdateLayout(): void {}

  didUpdate(): void {}

  getDestructor(): null {
    return null;
  }
}
