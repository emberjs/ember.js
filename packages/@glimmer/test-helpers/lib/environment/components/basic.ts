import {
  AnnotatedModuleLocator,
  Bounds,
  CompilableProgram,
  ComponentCapabilities,
  Environment,
  Invocation,
  RuntimeResolver,
  WithAotStaticLayout,
  WithJitStaticLayout,
} from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { CONSTANT_TAG, PathReference, Tag } from '@glimmer/reference';
import { expect, unreachable } from '@glimmer/util';
import { TestComponentDefinitionState } from '../components';
import EagerRuntimeResolver from '../modes/eager/runtime-resolver';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import { createTemplate } from '../shared';

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
    resolver: RuntimeResolver & (EagerRuntimeResolver | LazyRuntimeResolver)
  ): CompilableProgram {
    let { name } = state;

    if (resolver instanceof LazyRuntimeResolver) {
      let compile = (source: string) => {
        let template = createTemplate<AnnotatedModuleLocator>(source);
        return template.create().asLayout();
      };

      let handle = resolver.lookup('template-source', name)!;

      return resolver.compilableProgram(handle, name, compile);
    } else if (resolver instanceof EagerRuntimeResolver) {
      // For the case of dynamically invoking (via `{{component}}`) in eager
      // mode, we need to exchange the module locator for the handle to the
      // compiled layout (which was provided at bundle compilation time and
      // stashed in the component definition state).
      let locator = expect(
        state.locator,
        'component definition state should include module locator'
      );
      let invocation = resolver.getInvocation(locator);

      // TODO: Hack... is this the best approach?
      return {
        symbolTable: invocation.symbolTable,
        compile() {
          return invocation.handle;
        },
      };
    } else {
      throw new Error(
        `Must pass EagerRuntimeResolver or LazyRuntimeResolver to BasicComponentManager's getLayout`
      );
    }
  }

  getAotStaticLayout(
    state: TestComponentDefinitionState,
    resolver: RuntimeResolver & EagerRuntimeResolver
  ): Invocation {
    if (resolver instanceof EagerRuntimeResolver) {
      // For the case of dynamically invoking (via `{{component}}`) in eager
      // mode, we need to exchange the module locator for the handle to the
      // compiled layout (which was provided at bundle compilation time and
      // stashed in the component definition state).
      let locator = expect(
        state.locator,
        'component definition state should include module locator'
      );
      return resolver.getInvocation(locator);
    } else {
      throw new Error(`Must pass EagerRuntimeResolver to BasicComponentManager's getAotLayout`);
    }
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
