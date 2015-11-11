import Template, {
  EvaluatedHash
} from '../template';

import {
  Component,
  AppendingComponent,
} from './interfaces';

import { TemplateMorph, ContentMorph } from '../morph';
import { ElementStack } from '../builder';
import { isWhitespace } from '../dom';

export interface ComponentMorphOptions {
  attrs: EvaluatedHash;
  appending: AppendingComponent;
  layout: Template;
  component: Component;
}

export default class ComponentMorph extends TemplateMorph {
  private attrs: EvaluatedHash;
  private appending: AppendingComponent;
  private component: Component;

  init({ attrs, appending, layout, component }: ComponentMorphOptions) {
    this.attrs = attrs;
    this.appending = appending;
    this.template = layout;
    this.component = component;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);

    let { frame, component, template, appending: { hooks } } = this;

    frame.scope().bindSelf(component);

    hooks.didReceiveAttrs(component);
    hooks.willRender(component);
    frame.didCreate(component, hooks);

    super.appendTemplate(template, {});
  }

  update() {
    let { frame, appending, component, attrs } = this;
    let { hooks } = appending;

    appending.update(component, attrs);

    hooks.didReceiveAttrs(component);
    hooks.willUpdate(component);
    hooks.willRender(component);

    super.update();

    frame.didUpdate(component, hooks);
  }
}

// export class ComponentHandler extends NullHandler {
//   public rootElement: Element = null;

//   willOpenElement(tag: string) {
//     if (this.rootElement) {
//       throw new Error("You cannot create multiple root elements in a component's layout");
//     }
//   }

//   didOpenElement(element: Element) {
//     this.rootElement = element;
//   }

//   willAppendText(text: string) {
//     if (isWhitespace(text)) return;
//     throw new Error("You cannot have non-whitespace text at the root of a component's layout");
//   }

//   willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
//     if (Type.hasStaticElement) return;
//     throw new Error("You cannot have curlies (`{{}}`) at the root of a component's layout")
//   }
// }
