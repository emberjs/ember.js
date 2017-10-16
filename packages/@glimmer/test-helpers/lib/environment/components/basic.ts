import { createTemplate } from '../shared';

import { WithStaticLayout, Environment, ScannableTemplate, Bounds, Invocation } from '@glimmer/runtime';
import { unreachable, expect } from '@glimmer/util';
import { TemplateOptions } from '@glimmer/opcode-compiler';
import { PathReference, Tag, CONSTANT_TAG } from '@glimmer/reference';
import { ComponentCapabilities, Opaque } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';

import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import EagerRuntimeResolver from '../modes/eager/runtime-resolver';
import TestSpecifier from '../specifier';
import { TestComponentDefinitionState } from '../components';

export class BasicComponent {
  public element: Element;
  public bounds: Bounds;
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
  elementHook: false
};

export class BasicComponentManager implements WithStaticLayout<BasicComponent, TestComponentDefinitionState, TestSpecifier, LazyRuntimeResolver> {
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

  getLayout(state: TestComponentDefinitionState, resolver: EagerRuntimeResolver | LazyRuntimeResolver): Invocation {
    let { name } = state;

    if (resolver instanceof LazyRuntimeResolver) {
      let compile = (source: string, options: TemplateOptions<TestSpecifier>) => {
        let layout = createTemplate(source);
        let template = new ScannableTemplate(options, layout).asLayout();

        return {
          handle: template.compile(),
          symbolTable: template.symbolTable
        };
      };

      let handle = resolver.lookup('template-source', name)!;

      return resolver.compileTemplate(handle, name, compile);
    } else {
      // For the case of dynamically invoking (via `{{component}}`) in eager
      // mode, we need to exchange the specifier for the handle to the compiled
      // layout (which was provided at bundle compilation time and stashed in
      // the component definition state).
      let specifier = expect(state.specifier, 'component definition state should include specifier');
      return resolver.getInvocation(specifier);
    }
  }

  getSelf(component: BasicComponent): PathReference<Opaque> {
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

  didCreate(): void { }

  update(): void { }

  didUpdateLayout(): void { }

  didUpdate(): void { }

  getDestructor(): null {
    return null;
  }
}
