import { ElementStack } from '../builder';
import { TemplateMorph } from '../morph';
import {
  ComponentDefinition,
  ComponentDefinitionOptions
} from './interfaces';

export function appendComponent(stack: ElementStack, definition: ComponentDefinition, options: ComponentDefinitionOptions): TemplateMorph {
  let appending = definition.begin(stack, options);
  let morph = appending.process();
  morph.append(stack);
  return morph;
}