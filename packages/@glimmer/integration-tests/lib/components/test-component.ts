import { ComponentCapabilities, ModuleLocator, Template } from '@glimmer/interfaces';

export interface WrappedLocator {
  locator: ModuleLocator;
}

export interface TestComponentDefinitionState<T extends object = object> {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: T;
  template: Template | null;
}
