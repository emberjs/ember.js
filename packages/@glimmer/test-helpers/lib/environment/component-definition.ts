import { Option } from '@glimmer/util';
import { ProgramSymbolTable, ComponentCapabilities, ModuleLocator, TemplateLocator } from '@glimmer/interfaces';

export interface TemplateMeta {
  locator: ModuleLocator;
}

export function locatorFor(locator: ModuleLocator): TemplateLocator<TemplateMeta> {
  let { module, name } = locator;

  return {
    module,
    name,
    kind: 'template',
    meta: { locator }
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
  locator: TemplateLocator<TemplateMeta>;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
