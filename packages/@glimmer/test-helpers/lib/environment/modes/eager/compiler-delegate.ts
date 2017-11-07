import { ICompilableTemplate, CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { CompilerDelegate, ModuleLocator }  from '@glimmer/bundle-compiler';
import { Dict } from '@glimmer/util';
import { ProgramSymbolTable, ComponentCapabilities } from '@glimmer/interfaces';

import { Modules } from './modules';
import { ComponentDefinition } from '@glimmer/runtime';
import { TestComponentDefinitionState } from "@glimmer/test-helpers";
import { SerializedTemplateBlock } from '@glimmer/wire-format';

import { TemplateMeta } from '../../components';

export type ComponentDefinitionWithCapabilities = ComponentDefinition<TestComponentDefinitionState>;

export default class EagerCompilerDelegate implements CompilerDelegate<TemplateMeta> {
  constructor(
    private components: Dict<ComponentDefinitionWithCapabilities>,
    private modules: Modules,
  ) {}

  hasComponentInScope(componentName: string, referrer: TemplateMeta): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponent(componentName: string, referrer: TemplateMeta): ModuleLocator {
    return { module: this.modules.resolve(componentName, referrer, 'ui/components')!, name: 'default' };
  }

  getComponentCapabilities(meta: TemplateMeta): ComponentCapabilities {
    return this.components[meta.locator.module].state.capabilities;
  }

  getComponentLayout(_: TemplateMeta, block: SerializedTemplateBlock, options: CompileOptions<TemplateMeta>): ICompilableTemplate<ProgramSymbolTable> {
    return CompilableTemplate.topLevel(block, options);
  }

  hasHelperInScope(helperName: string, referrer: TemplateMeta): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelper(helperName: string, referrer: TemplateMeta): ModuleLocator {
    let path = this.modules.resolve(helperName, referrer);
    return { module: path!, name: 'default' };
  }

  hasModifierInScope(_modifierName: string, _referrer: TemplateMeta): boolean {
    return false;
  }

  resolveModifier(_modifierName: string, _referrer: TemplateMeta): ModuleLocator {
    throw new Error("Method not implemented.");
  }

  hasPartialInScope(_partialName: string, _referrer: TemplateMeta): boolean {
    return false;
  }

  resolvePartial(_partialName: string, _referrer: TemplateMeta): ModuleLocator {
    throw new Error("Method not implemented.");
  }
}
