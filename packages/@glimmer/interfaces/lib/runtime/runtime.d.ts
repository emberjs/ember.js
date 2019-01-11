import { Environment } from './environment';
import { RuntimeHeap, RuntimeConstants, RuntimeOp } from '../program';
import { RuntimeResolverDelegate } from '../serialize';

/**
  The Runtime is the set of static structures that contain the compiled
  code and any host configuration.

  The contents of the Runtime do not change as the VM executes, unlike
  the VM state.
 */
export interface RuntimeContext<R extends TemplateMeta = TemplateMeta> {
  env: Environment;
  program: RuntimeProgram;
  resolver: RuntimeResolverDelegate<R>;
}

export interface RuntimeProgram {
  readonly constants: RuntimeConstants;
  readonly heap: RuntimeHeap;

  opcode(offset: number): RuntimeOp;
}

export const enum TemplateMetaEnum {}
export type OpaqueTemplateMeta = TemplateMetaEnum & {};

export type TemplateMeta<Inner = unknown> = OpaqueTemplateMeta & Inner;
