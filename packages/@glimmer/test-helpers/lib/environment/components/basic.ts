import { GenericComponentManager, createTemplate, GenericStaticComponentState } from '../shared';
import { TestSpecifier, TestResolver } from '../lazy-env';

import { WithStaticLayout, Environment, ScannableTemplate, Bounds, Invocation } from "@glimmer/runtime";
import { unreachable } from "@glimmer/util";
import { TemplateOptions, ComponentCapabilities } from "@glimmer/opcode-compiler";
import { PathReference, Tag, CONSTANT_TAG } from "@glimmer/reference";
import { Opaque, Recast, VMHandle } from "@glimmer/interfaces";
import { UpdatableReference } from "@glimmer/object-reference";
import { RuntimeResolver } from '../bundle-compiler';
import { Specifier } from '@glimmer/bundle-compiler';

export const EMPTY_CAPABILITIES = {
  staticDefinitions: true,
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

export class BundlingBasicComponentManager implements WithStaticLayout<BasicComponent, { specifier: Specifier }, Specifier, RuntimeResolver> {
  getCapabilities(_definition: { specifier: Specifier }) {
    return EMPTY_CAPABILITIES;
  }

  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, _definition: Opaque): BasicComponent {
    let klass = BasicComponent;
    return new klass();
  }

  getLayout(definition: { specifier: Specifier }, resolver: RuntimeResolver): Invocation {
    let handle = resolver.getVMHandle(definition.specifier);
    let symbolTable = resolver.symbolTables.get(definition.specifier)!;
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

export class BasicComponentManager extends GenericComponentManager implements WithStaticLayout<BasicComponent, BasicStaticComponentState, TestSpecifier, TestResolver> {
  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, definition: BasicStaticComponentState): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass();
  }

  getLayout({ name }: BasicStaticComponentState, resolver: TestResolver): Invocation {
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

export const BASIC_COMPONENT_MANAGER = new BasicComponentManager();

export interface BasicComponentFactory {
  new (): BasicComponent;
}

export class BasicStaticComponentState extends GenericStaticComponentState {
  public name: string;
  public ComponentClass: BasicComponentFactory;
  public capabilities: ComponentCapabilities = {
    staticDefinitions: false,
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: true,
    elementHook: false
  };
}

export class BasicComponent {
  public element: Element;
  public bounds: Bounds;
}
