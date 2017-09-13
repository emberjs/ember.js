import { Option } from '@glimmer/util';
import { ProgramSymbolTable } from '@glimmer/interfaces';
import { Specifier } from '@glimmer/bundle-compiler';
import { ComponentCapabilities } from "@glimmer/opcode-compiler";

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
