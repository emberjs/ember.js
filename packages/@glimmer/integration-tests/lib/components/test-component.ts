import { InternalComponentCapabilities, Template } from '@glimmer/interfaces';

export interface TestComponentDefinitionState<T extends object = object> {
  /* Manager-related */
  capabilities: InternalComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: T;
  template: Template | null;
}
