import {
  ComponentCapabilities,
  Option,
  ModuleLocator,
  ProgramSymbolTable,
} from '@glimmer/interfaces';

export interface WrappedLocator {
  locator: ModuleLocator;
}

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  locator: ModuleLocator;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
