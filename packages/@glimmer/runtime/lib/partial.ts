import { TemplateMeta } from '@glimmer/wire-format';
import { Template } from './template';

export class PartialDefinition<T extends TemplateMeta> {
  constructor(
    public name: string, // for debugging
    public template: Template<T>
  ) {
  }
}
