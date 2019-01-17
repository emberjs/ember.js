import {
  ComponentCapabilities,
  Option,
  TemplateLocator,
  ModuleLocator,
  TemplateMeta,
  ProgramSymbolTable,
} from '@glimmer/interfaces';

export interface WrappedLocatorData {
  locator: ModuleLocator;
}

export type WrappedLocator = TemplateMeta<WrappedLocatorData>;

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  locator: TemplateLocator<WrappedLocator>;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
