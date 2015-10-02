import { TemplateMorph } from '../morph';
import { ElementStack, ComponentOperations } from '../builder';
import { ComponentDefinition, ComponentClass, Block } from '../environment';
import Template, { EvaluatedHash } from '../template';
import { LITERAL } from 'htmlbars-util';

interface ComponentOptions {
  definition: ComponentDefinition,
  attrs: EvaluatedHash,
  template: Template
}

class YieldedContents extends TemplateMorph {
  init({ template }) {
    this.template = template;
  }
}

export default class ComponentMorph extends TemplateMorph {
  private attrs: EvaluatedHash;
  private klass: ComponentClass;
  private innerTemplate: Template;

  init({ definition, attrs, template }: ComponentOptions) {
    this.attrs = attrs;
    this.template = definition.layout;
    this.klass = definition.class;
    this.innerTemplate = template;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);

    let { frame, innerTemplate, template } = this;

    let originalFrame = this.frame;
    this.frame = this.frame.child();
    let scope = this.frame.resetScope();
    scope.bindBlock(LITERAL('default'), new Block(innerTemplate, originalFrame));

    let operations = new ComponentOperations(stack.operations);
    stack.refine(operations, () => super.append(stack));

    debugger;
  }
}