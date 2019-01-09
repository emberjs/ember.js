import { Option, templateMeta } from '@glimmer/util';
import {
  ProgramSymbolTable,
  ComponentCapabilities,
  ModuleLocator,
  TemplateLocator,
  TemplateMeta,
} from '@glimmer/interfaces';

export interface WrappedLocatorData {
  locator: ModuleLocator;
}

export type WrappedLocator = TemplateMeta<WrappedLocatorData>;

export function locatorFor(
  moduleLocator: ModuleLocator
): TemplateMeta<TemplateLocator<WrappedLocator>> {
  let { module, name } = moduleLocator;

  let l: TemplateLocator<WrappedLocator> = {
    module,
    name,
    kind: 'template',
    meta: templateMeta({ locator: moduleLocator }),
  };

  return templateMeta(l);
}

export interface TestComponentDefinitionState {
  /* Manager-related */
  capabilities: ComponentCapabilities;

  /* Component-related */
  name: string;
  ComponentClass: any;
  type: string;
  layout: Option<number>;
  locator: TemplateLocator<WrappedLocator>;
  template?: string;
  hasSymbolTable?: boolean;
  symbolTable?: ProgramSymbolTable;
}
