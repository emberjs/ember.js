import { TemplateMorph, ContentMorph } from '../morph';
import { ElementStack, DelegatingOperations, NestedOperations, NullHandler } from '../builder';
import { ComponentDefinition, ComponentClass, Component, Block, Scope, Frame } from '../environment';
import Template, { Hash, EvaluatedHash, StaticAttr, DynamicAttr, AttributeSyntax } from '../template';
import { LITERAL } from 'htmlbars-util';
import { isWhitespace } from '../dom';
import { RootReference } from 'htmlbars-reference';

interface ComponentOptions {
  definition: ComponentDefinition,
  attrs: Hash,
  template: Template
}

class YieldedContents extends TemplateMorph {
  init({ template }) {
    this.template = template;
  }
}

export default class ComponentMorph extends TemplateMorph {
  private attrs: EvaluatedHash;
  private attrSyntax: AttributeSyntax[];
  private klass: ComponentClass;
  private component: Component;
  private innerTemplate: Template;
  private layoutScope: Scope;

  init({ definition, attrs: hash, template }: ComponentOptions) {
    this.template = definition.layout;
    this.klass = definition['class']; // vscode syntax highlighting bug
    this.innerTemplate = template;

    let attrs = [];

    let { keys, values } = hash;

    values.forEach((val, i) => {
      let key = keys[i];
      if (val.isStatic) attrs.push(StaticAttr.build(key, val));
      else attrs.push(DynamicAttr.build(key, val));
    });

    this.attrSyntax = attrs;
    this.attrs = hash.evaluate(this.frame);
  }

  append(stack: ElementStack) {
    this.willAppend(stack);

    let { frame, innerTemplate, template } = this;

    let invokeFrame = this.frame;
    let layoutFrame = this.frame = this.frame.child();
    let layoutScope = this.layoutScope = layoutFrame.resetScope();
    let self = this.component = new this.klass(this.attrs.value());

    layoutScope.bindSelf(self);
    layoutScope.bindBlock(LITERAL('default'), new Block(innerTemplate, invokeFrame));

    let handler = new ComponentHandler(invokeFrame, this.attrSyntax);

    this.willAppend(stack);
    super.appendTemplate(template, { handler, nextSibling: stack.nextSibling });

    if (!handler.rootElement) {
      throw new Error("A component must have a single root element at the top level");
    }
  }

  update() {
    this.component.attrs = this.attrs.value();
    this.layoutScope.updateSelf(this.component);

    super.update();
  }
}

export class ComponentHandler extends NullHandler {
  public rootElement: Element = null;
  private attrs: AttributeSyntax[];
  private frame: Frame;

  constructor(frame: Frame, attrs: AttributeSyntax[]) {
    super();
    this.frame = frame;
    this.attrs = attrs;
  }

  willOpenElement(tag: string) {
    if (this.rootElement) {
      throw new Error("You cannot create multiple root elements in a component's layout");
    }
  }

  didOpenElement(element: Element) {
    this.attrs.forEach(attr => this.stack.appendStatement(attr, this.frame))
    this.rootElement = element;
  }

  willAppendText(text: string) {
    throw new Error("You cannot have non-whitespace text at the root of a component's layout");
  }

  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
    throw new Error("You cannot have curlies (`{{}}`) at the root of a component's layout")
  }
}