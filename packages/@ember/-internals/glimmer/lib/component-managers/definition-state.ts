import { Factory } from '@ember/-internals/owner';
import { ComponentCapabilities, Option, ProgramSymbolTable } from '@glimmer/interfaces';
import { Component } from '../utils/curly-component-state-bucket';

export default interface DefinitionState {
  capabilities: ComponentCapabilities;
  name: string;
  ComponentClass: Factory<
    Component,
    { create(props?: any): Component; positionalParams: string | string[] | undefined | null }
  >;
  handle: Option<number>;
  symbolTable?: ProgramSymbolTable;
  template?: any;
}
