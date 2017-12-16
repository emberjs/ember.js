import {
  ComponentCapabilities,
  ProgramSymbolTable,
  VMHandle
} from '@glimmer/interfaces';
import {
  Option
} from '@glimmer/util';

export default interface DefinitionState {
  capabilities: ComponentCapabilities;

  name: string;
  ComponentClass: any;
  handle: Option<VMHandle>;
  symbolTable?: ProgramSymbolTable;
  template?: any;
  outletName?: string;
}
