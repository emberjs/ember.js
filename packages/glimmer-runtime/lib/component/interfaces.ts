import { InternedString, Slice } from 'glimmer-util';
import {
  Frame
} from '../environment';
import Template, {
  Templates,
  EvaluatedHash,
  AttributeSyntax
} from '../template';
import {
  ElementStack
} from '../builder';
import {
  TemplateMorph
} from '../morph';

export interface ComponentClass {
  new (attrs: Object): Component;
}

export interface Component {
  attrs: Object;
}

export interface ComponentHooks {
  begin(Component);
  commit(Component);

  didReceiveAttrs(Component);
  didUpdateAttrs(Component);

  didInsertElement(Component);

  willRender(Component);
  willUpdate(Component);
  didRender(Component);
  didUpdate(Component);
}

export interface ComponentDefinitionOptions {
  frame: Frame;
  templates: Templates;
  hash: EvaluatedHash;
  tag: InternedString;
}

export interface AppendingComponentOptions {
  hooks: ComponentHooks;
  ComponentClass: ComponentClass;
  layout: Template;
  stack: ElementStack;
}

export interface AppendingComponentClass {
  new({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions): AppendingComponent;
}

export interface ComponentHooks {
  begin(Component: Component);
  commit(Component: Component);

  didReceiveAttrs(Component: Component);
  didUpdateAttrs(Component: Component);

  didInsertElement(Component: Component);

  willRender(Component: Component);
  willUpdate(Component: Component);
  didRender(Component: Component);
  didUpdate(Component: Component);
}

class NullHooks implements ComponentHooks {
  begin() {};
  commit() {};

  didReceiveAttrs() {};
  didUpdateAttrs() {};

  didInsertElement() {};

  willRender() {};
  willUpdate() {};
  didRender() {};
  didUpdate() {};
}

const NULL_HOOKS = new NullHooks();

export abstract class ComponentDefinition {
  public hooks: ComponentHooks;
  public ComponentClass: ComponentClass;
  public layout: Template;
  protected ComponentInvocation: ComponentInvocationClass;

  constructor(hooks: ComponentHooks, ComponentClass: ComponentClass, layout: Template, ComponentInvocation: ComponentInvocationClass) {
    this.hooks = hooks || NULL_HOOKS;
    this.ComponentClass = ComponentClass;
    this.layout = layout;
    this.ComponentInvocation = ComponentInvocation;
  }

  abstract compile(attributes: Slice<AttributeSyntax>, yieldTo: Templates): ComponentInvocation;
}

export interface ComponentInvocationClass {
  new(templates: Templates, layout: Template): ComponentInvocation;
}

export interface ComponentInvocation {
  templates: Templates;
  layout: Template;
}

// export class ComponentDefinition {

//   begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions): AppendingComponent {
//     let { hooks, ComponentClass, layout } = this;
//     let appending = new this.AppendingComponent({ hooks, ComponentClass, layout, stack });
//     appending.begin(stack, { frame, templates, hash, tag });
//     return appending;
//   }
// }

// export interface AppendingComponent {
//   ComponentClass: ComponentClass;
//   layout: Template;
//   begin(stack: ElementStack, options: ComponentDefinitionOptions);
//   process(): TemplateMorph;
//   update(component: Component, attrs: EvaluatedHash);
//   hooks: ComponentHooks;
// }
