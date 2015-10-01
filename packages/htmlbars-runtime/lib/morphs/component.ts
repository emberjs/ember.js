import { TemplateMorph } from '../morph';
import { ElementStack } from '../builder';
import { ComponentDefinition } from '../environment';
import { EvaluatedHash } from '../template';

interface ComponentOptions {
  definition: ComponentDefinition,
  attrs: EvaluatedHash
}

export default class ComponentMorph extends TemplateMorph {
  private definition: ComponentDefinition;
  private attrs: EvaluatedHash;

  init({ definition, attrs }: ComponentOptions) {
    this.definition = definition;
    this.attrs = attrs;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
  }
}