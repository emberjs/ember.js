import { Option } from '@glimmer/util';
import { ProgramSymbolTable, ComponentCapabilities } from '@glimmer/interfaces';
import { TemplateLocator } from '@glimmer/bundle-compiler';

export interface TemplateMeta {
  locator: TemplateLocator;
}

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  locator?: TemplateLocator<TemplateMeta>;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
