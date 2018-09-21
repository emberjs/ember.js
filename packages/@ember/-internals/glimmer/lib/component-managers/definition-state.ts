import { Factory } from '@ember/-internals/owner';
import { ComponentCapabilities, ProgramSymbolTable, VMHandle } from '@glimmer/interfaces';
import { Option } from '@glimmer/util';
import { Component } from '../utils/curly-component-state-bucket';

export default interface DefinitionState {
  capabilities: ComponentCapabilities;
  name: string;
  ComponentClass: Factory<
    Component,
    { create(props?: any): Component; positionalParams: string | string[] | undefined | null }
  >;
  handle: Option<VMHandle>;
  symbolTable?: ProgramSymbolTable;
  template?: any;
};
