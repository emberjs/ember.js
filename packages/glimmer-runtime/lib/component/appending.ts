import {
  Component,
  AppendingComponent as IAppendingComponent,
  ComponentHooks,
  ComponentClass,
  AppendingComponentOptions,
  ComponentDefinitionOptions
} from './interfaces';

import ComponentMorph from './morph';

import Template, {
  Templates,
  EvaluatedHash
} from '../template';

import { TemplateMorph, Morph, createMorph } from '../morph';
import { ElementStack } from '../builder';
import { Frame, Block, Scope } from '../environment';

import { LITERAL, InternedString, Dict } from 'htmlbars-util';
import { ChainableReference } from 'htmlbars-reference';

abstract class AppendingComponent implements IAppendingComponent {
  public hooks: ComponentHooks;
  public ComponentClass: ComponentClass;
  public layout: Template;
  protected stack: ElementStack;
  protected frame: Frame = null;
  protected attrs: ChainableReference = null;
  protected templates: Templates = null;
  protected hash: EvaluatedHash = null;
  protected tag: InternedString = null;

  constructor({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions) {
    this.hooks = hooks;
    this.ComponentClass = ComponentClass;
    this.layout = layout.clone();
    this.stack = stack;
  }

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.frame = frame;
    this.templates = templates;
    this.hash = hash;
    this.tag = tag;
  }

  // <my-component>{{foo}}</my-component>
  // <my-component></my-component> <my-component /> "empty"
  // {{#my-component}}{{/my-component}} "not empty"
  // {{my-component}} "empty"

  process(): TemplateMorph {
    let { stack, frame, templates, hash } = this;

    let parentScope = frame.scope();
    let layoutFrame = frame.child();
    let layoutScope = layoutFrame.resetScope();
    let blockScope;

    if (templates) {
      let blockFrame = frame.child();
      blockScope = blockFrame.childScope();

      if (this.templateIsPresent(templates.default)) {
        let block = new Block(templates.default, blockFrame);
        layoutScope.bindBlock(LITERAL('default'), block);
      }

      if (this.templateIsPresent(templates.inverse)) {
        let block = new Block(templates.inverse, blockFrame);
        layoutScope.bindBlock(LITERAL('inverse'), block);
      }
    }

    let attrs = hash.value();
    let component = this.createComponent(attrs, parentScope);

    if (blockScope) this.augmentBlockScope(blockScope, frame.scope(), component);
    this.setupLayoutScope(layoutScope, component);

    let layout = this.layoutWithAttrs(frame);

    return createMorph(ComponentMorph, stack.element, layoutFrame, { attrs: hash, appending: this, layout, component });
  }

  protected layoutWithAttrs(invokeFrame: Frame): Template {
    return this.layout;
  }

  protected setupLayoutScope(scope: Scope<any>, component: Component) {
    scope.bindSelf(component);
  }

  abstract update(component: Component, hash: EvaluatedHash);
  protected abstract augmentBlockScope<T>(blockScope: Scope<T>, parentScope: Scope<T>, component: Component);
  protected abstract createComponent(attrs: Dict<any>, parentScope: Scope<any>): Component;
  protected abstract templateIsPresent(template: Template): boolean;
}

export default AppendingComponent;