import {
  Opaque,
  Option,
  CompilableBlock,
  ComponentCapabilities,
  CompileTimeProgram,
} from '@glimmer/interfaces';
import { Core, SerializedTemplateBlock } from '@glimmer/wire-format';
import { Macros } from './syntax';

export interface EagerResolver<Locator> {
  getCapabilities(locator: Locator): ComponentCapabilities;
}

export interface EagerCompilationOptions<TemplateMeta, R extends EagerResolver<TemplateMeta>> {
  resolver: R;
  program: CompileTimeProgram;
  macros: Macros;
}

export const PLACEHOLDER_HANDLE = -1;

export type Primitive = undefined | null | boolean | number | string;

export type ComponentArgs = [Core.Params, Core.Hash, Option<CompilableBlock>, Option<CompilableBlock>];

export interface ComponentBuilder {
  static(definition: number, args: ComponentArgs): void;
}
