import { SerializedTemplate } from 'glimmer-wire-format';

export class PartialDefinition {
  name: string;
  template: SerializedTemplate;

  constructor(name: string, template: SerializedTemplate) {
    this.name = name;
    this.template = template;
  }

}
