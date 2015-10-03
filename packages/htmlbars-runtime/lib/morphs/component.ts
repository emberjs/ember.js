import { TemplateMorph, ContentMorph } from '../morph';
import { ElementStack, DelegatingOperations, wrap } from '../builder';
import { ComponentDefinition, ComponentClass, Block, Frame } from '../environment';
import Template, { Hash, StaticAttr, DynamicAttr, AttributeSyntax } from '../template';
import { LITERAL } from 'htmlbars-util';
import { isWhitespace } from '../dom';

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
  private attrs: AttributeSyntax[];
  private klass: ComponentClass;
  private innerTemplate: Template;

  init({ definition, attrs: hash, template }: ComponentOptions) {
    this.template = definition.layout;
    this.klass = definition['class']; // vscode syntax highlighting bug
    this.innerTemplate = template;

    let attrs = [];

    let { keys, values } = hash;

    values.forEach((val, i) => {
      let key = keys[i];
      if (val.isStatic) attrs.push(StaticAttr.build(key, val.evaluate(this.frame).value()));
      else attrs.push(DynamicAttr.build(key, val));
    });

    this.attrs = attrs;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);

    let { frame, innerTemplate, template } = this;

    let originalFrame = this.frame;
    this.frame = this.frame.child();
    let scope = this.frame.resetScope();
    scope.bindBlock(LITERAL('default'), new Block(innerTemplate, originalFrame));

    let operations = wrap(stack, ComponentOperations, () => super.append(stack));
  }
}

export class ComponentOperations extends DelegatingOperations {
  public rootElement: Element = null;
  private attrs: AttributeSyntax[];
  private stack: ElementStack;
  private frame: Frame;

  init({ attrs, stack, frame }: { attrs: AttributeSyntax[], stack: ElementStack, frame: Frame }) {
    this.attrs = attrs;
    this.stack = stack;
  }

  willOpenElement(tag: string) {
    debugger;
    if (this.rootElement) throw new Error("You cannot create multiple root elements in a component's layout");
    super.willOpenElement(tag);
  }

  willCloseElement() {
    //this.attrs.forEach(attr => this.stack.appendStatement(attr, this.frame));

    super.willCloseElement();
  }

  didOpenElement(element: Element) {
    this.rootElement = element;
    super.didOpenElement(element);
  }

  willAppendText(text: string) {
    if (!isWhitespace(text)) throw new Error("You cannot have non-whitespace text at the root of a component's layout");
    super.willAppendText(text);
  }

  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
    throw new Error("You cannot have curlies (`{{}}`) at the root of a component's layout")
    super.willCreateContentMorph(Type, attrs);
  }
}
