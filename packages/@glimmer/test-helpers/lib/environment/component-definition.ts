import { Option } from '@glimmer/util';
import { ProgramSymbolTable, ComponentCapabilities } from '@glimmer/interfaces';
import { Specifier } from '@glimmer/bundle-compiler';

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  specifier?: Specifier;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
