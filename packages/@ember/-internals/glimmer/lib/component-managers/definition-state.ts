import { Factory } from '@ember/-internals/owner';
import { InternalComponentCapabilities, Template } from '@glimmer/interfaces';
import { Component } from '../utils/curly-component-state-bucket';

export default interface DefinitionState {
  capabilities: InternalComponentCapabilities;
  name: string;
  ComponentClass: Factory<
    Component,
    { create(props?: any): Component; positionalParams: string | string[] | undefined | null }
  >;
  template?: Template;
}
