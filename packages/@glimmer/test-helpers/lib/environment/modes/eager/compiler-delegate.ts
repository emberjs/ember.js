import { ICompilableTemplate, CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { CompilerDelegate, TemplateLocator, ModuleLocator }  from '@glimmer/bundle-compiler';
import { Dict } from '@glimmer/util';
import { ProgramSymbolTable, ComponentCapabilities } from '@glimmer/interfaces';

import { Modules } from './modules';
import { ComponentDefinition } from '@glimmer/runtime';
import { TestComponentDefinitionState } from "@glimmer/test-helpers";
import { SerializedTemplateBlock } from '@glimmer/wire-format';

export type ComponentDefinitionWithCapabilities = ComponentDefinition<TestComponentDefinitionState>;

export default class EagerCompilerDelegate implements CompilerDelegate {
  constructor(
    private components: Dict<ComponentDefinitionWithCapabilities>,
    private modules: Modules,
  ) {}

  hasComponentInScope(componentName: string, referrer: TemplateLocator): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponent(componentName: string, referrer: TemplateLocator): ModuleLocator {
    return { module: this.modules.resolve(componentName, referrer, 'ui/components')!, name: 'default' };
  }

  getComponentCapabilities(locator: TemplateLocator): ComponentCapabilities {
    return this.components[locator.module].state.capabilities;
  }

  getComponentLayout(_: TemplateLocator, block: SerializedTemplateBlock, options: CompileOptions<TemplateLocator>): ICompilableTemplate<ProgramSymbolTable> {
    return CompilableTemplate.topLevel(block, options);
  }

  hasHelperInScope(helperName: string, referrer: TemplateLocator): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelper(helperName: string, referrer: TemplateLocator): TemplateLocator {
    let path = this.modules.resolve(helperName, referrer);
    return { module: path!, name: 'default' };
  }

  hasModifierInScope(_modifierName: string, _referrer: TemplateLocator): boolean {
    return false;
  }

  resolveModifier(_modifierName: string, _referrer: TemplateLocator): ModuleLocator {
    throw new Error("Method not implemented.");
  }

  hasPartialInScope(_partialName: string, _referrer: TemplateLocator): boolean {
    return false;
  }

  resolvePartial(_partialName: string, _referrer: TemplateLocator): ModuleLocator {
    throw new Error("Method not implemented.");
  }
}
