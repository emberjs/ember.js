import {
  ComponentCapabilities,
  ProgramSymbolTable,
  VMHandle
} from '@glimmer/interfaces';
import {
  Option
} from '@glimmer/util';

export const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: false,
  createArgs: true,
  attributeHook: true,
  elementHook: true
};

export default interface DefinitionState {
  capabilities: ComponentCapabilities;

  name: string;
  ComponentClass: any;
  handle: Option<VMHandle>;
  symbolTable?: ProgramSymbolTable;
  template?: any;
  outletName?: string;
}
