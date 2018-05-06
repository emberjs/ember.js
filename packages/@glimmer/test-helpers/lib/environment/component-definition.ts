import { Option } from '@glimmer/util';
import {
  ProgramSymbolTable,
  ComponentCapabilities,
  ModuleLocator,
  TemplateLocator,
} from '@glimmer/interfaces';

export interface Locator {
  locator: ModuleLocator;
}

export function locatorFor(locator: ModuleLocator): TemplateLocator<Locator> {
  let { module, name } = locator;

  return {
    module,
    name,
    kind: 'template',
    meta: { locator },
  };
}

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  locator: TemplateLocator<Locator>;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
