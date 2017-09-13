import { ComponentDefinition } from '@glimmer/runtime';
import { Option } from '@glimmer/util';
import { ComponentCapabilities } from '@glimmer/opcode-compiler';
import { ProgramSymbolTable } from '@glimmer/interfaces';
import { Specifier } from '@glimmer/bundle-compiler';

export interface GenericComponentDefinitionState {
  name: string;
  ComponentClass: any;
  capabilities: ComponentCapabilities;
  specifier?: Specifier;
  type?: string;
  template?: string;
  layout: Option<number>;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}

export class GenericComponentDefinition<State extends GenericComponentDefinitionState, Manager> implements ComponentDefinition<State, Manager> {
  state: State;
  manager: Manager;

  constructor(manager: Manager, state: State) {
    this.state = state;
    this.manager = manager;
  }
}
