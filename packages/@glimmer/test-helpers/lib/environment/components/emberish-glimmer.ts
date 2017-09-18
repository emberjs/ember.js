
import { TemplateOptions, Specifier } from "@glimmer/opcode-compiler";
import { CapturedNamedArguments, ComponentManager, WithStaticLayout, Environment, Arguments, PrimitiveReference, ElementOperations, Bounds, ScannableTemplate, Invocation } from "@glimmer/runtime";
import { Opaque, Option, ComponentCapabilities } from "@glimmer/interfaces";
import { PathReference, Tag, combine, TagWrapper, DirtyableTag } from "@glimmer/reference";
import { UpdatableReference } from "@glimmer/object-reference";
import GlimmerObject from "@glimmer/object";
import { Destroyable } from "@glimmer/util";

import { Attrs, AttrsDiff, createTemplate } from '../shared';
import TestSpecifier from '../specifier';
import { BASIC_CAPABILITIES } from './basic';
import { TestComponentDefinitionState } from '../components';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';

export const EMBERISH_GLIMMER_CAPABILITIES = {
  ...BASIC_CAPABILITIES,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

export interface EmberishGlimmerComponentState {
  args: CapturedNamedArguments;
  component: EmberishGlimmerComponent;
}

export class EmberishGlimmerComponentManager
  implements ComponentManager<EmberishGlimmerComponentState, TestComponentDefinitionState>,
             WithStaticLayout<EmberishGlimmerComponentState, TestComponentDefinitionState, Specifier, LazyRuntimeResolver> {

  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  prepareArgs(): null {
    return null;
  }

  create(_environment: Environment, definition: TestComponentDefinitionState, _args: Arguments, _dynamicScope: any, _callerSelf: PathReference<Opaque>, _hasDefaultBlock: boolean): EmberishGlimmerComponentState {
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

  getLayout({ name }: TestComponentDefinitionState, resolver: LazyRuntimeResolver): Invocation {
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

  getSelf({ component }: EmberishGlimmerComponentState): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement({ component }: EmberishGlimmerComponentState, element: Element, operations: ElementOperations): void {
    component.element = element;
    operations.setAttribute('id', PrimitiveReference.create(`ember${component._guid}`), false, null);
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);
  }

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

  didUpdateLayout(): void { }

  didUpdate({ component }: EmberishGlimmerComponentState): void {
    component.didUpdate();
    component.didRender();
  }

  getDestructor({ component }: EmberishGlimmerComponentState): Destroyable {
    return {
      destroy() {
        component.destroy();
      }
    };
  }
}

export class EmberishGlimmerComponent extends GlimmerObject {
  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Option<EmberishGlimmerComponent> = null;

  static create(args: { attrs: Attrs }): EmberishGlimmerComponent {
    return super.create(args) as EmberishGlimmerComponent;
  }

  recompute() {
    this.dirtinessTag.inner.dirty();
  }

  didInitAttrs(_options: { attrs: Attrs }) { }
  didUpdateAttrs(_diff: AttrsDiff) { }
  didReceiveAttrs(_diff: AttrsDiff) { }
  willInsertElement() { }
  willUpdate() { }
  willRender() { }
  didInsertElement() { }
  didUpdate() { }
  didRender() { }
}

export interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;
