import { createTemplate } from '../shared';

import { WithStaticLayout, Environment, ScannableTemplate, Bounds, Invocation } from "@glimmer/runtime";
import { unreachable, expect } from "@glimmer/util";
import { TemplateOptions, ComponentCapabilities, Specifier } from "@glimmer/opcode-compiler";
import { PathReference, Tag, CONSTANT_TAG } from "@glimmer/reference";
import { Opaque, Recast, VMHandle } from "@glimmer/interfaces";
import { UpdatableReference } from '@glimmer/object-reference';

import RuntimeResolver from '../modes/lazy/runtime-resolver';
import TestSpecifier from '../specifier';
import { TestComponentDefinitionState } from '../components';
import { EagerRuntimeResolver } from '../modes/eager/runtime-resolver';

export class BasicComponent {
  public element: Element;
  public bounds: Bounds;
}

export const BASIC_CAPABILITIES: ComponentCapabilities = {
  staticDefinitions: true,
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

export class BasicComponentManager implements WithStaticLayout<BasicComponent, TestComponentDefinitionState, TestSpecifier, RuntimeResolver> {
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

  getLayout({ name }: TestComponentDefinitionState, resolver: RuntimeResolver): Invocation {
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

export class EagerBasicComponentManager implements WithStaticLayout<BasicComponent, TestComponentDefinitionState, Specifier, EagerRuntimeResolver> {
  getCapabilities() {
    return BASIC_CAPABILITIES;
  }

  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, definition: TestComponentDefinitionState): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass();
  }

  getLayout(state: TestComponentDefinitionState, resolver: EagerRuntimeResolver): Invocation {
    let specifier = expect(state.specifier, 'component definition state should include specifier');
    let handle = resolver.getVMHandle(specifier);
    let symbolTable = resolver.symbolTables.get(specifier)!;
    return {
      handle: handle as Recast<number, VMHandle>,
      symbolTable
    };
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

export interface BasicComponentFactory {
  new (): BasicComponent;
}
