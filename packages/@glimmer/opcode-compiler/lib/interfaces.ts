import {
  Option,
  CompilableBlock,
  ComponentCapabilities,
  CompileTimeProgram,
} from '@glimmer/interfaces';
import { Core } from '@glimmer/wire-format';
import { Macros } from './syntax';

export interface EagerResolver<Locator> {
  getCapabilities(locator: Locator): ComponentCapabilities;
}

export interface EagerCompilationOptions<Locator, R extends EagerResolver<Locator>> {
  resolver: R;
  program: CompileTimeProgram;
  macros: Macros;
}

export const PLACEHOLDER_HANDLE = -1;

export type Primitive = undefined | null | boolean | number | string;

export type ComponentArgs = [
  Core.Params,
  Core.Hash,
  Option<CompilableBlock>,
  Option<CompilableBlock>
];

export interface ComponentBuilder {
  static(definition: number, args: ComponentArgs): void;
}
