import {
  Bounds,
  WithStaticLayout,
  RuntimeResolver,
  Environment,
  CompilableProgram,
  ComponentCapabilities,
} from '@glimmer/interfaces';
import { TestComponentDefinitionState } from './test-component';
import { unreachable, unwrapTemplate } from '@glimmer/util';
import { Reference, createConstRef } from '@glimmer/reference';

export interface BasicComponentFactory {
  new (): BasicComponent;
}

export class BasicComponent {
  public element!: Element;
  public bounds!: Bounds;
}

export class BasicComponentManager
  implements WithStaticLayout<BasicComponent, TestComponentDefinitionState, RuntimeResolver> {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, definition: TestComponentDefinitionState): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass();
  }

  getDebugName(state: TestComponentDefinitionState) {
    return state.name;
  }

  getStaticLayout(
    state: TestComponentDefinitionState,
    resolver: RuntimeResolver
  ): CompilableProgram {
    return unwrapTemplate(resolver.compilable(state.locator)).asLayout();
  }

  getSelf(component: BasicComponent): Reference {
    return createConstRef(component, 'this');
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

  getDestroyable(): null {
    return null;
  }
}
