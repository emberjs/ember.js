import { Template } from './template';

export class PartialDefinition<T> {
  name: string;
  template: Template<T>;

  constructor(name: string, template: Template<T>) {
    this.name = name;
    this.template = template;
  }
}
