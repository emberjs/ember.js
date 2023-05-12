import type {
  CompileTimeArtifacts,
  CompileTimeCompilationContext,
  CompileTimeResolver,
  ContainingMetadata,
  CreateRuntimeOp,
  TemplateCompilationContext,
} from "@glimmer/interfaces";

import { CompileTimeCompilationContextImpl } from '../program-context';
import { EncoderImpl } from './encoder';

export function programCompilationContext(
  artifacts: CompileTimeArtifacts,
  resolver: CompileTimeResolver,
  createOp: CreateRuntimeOp
): CompileTimeCompilationContext {
  return new CompileTimeCompilationContextImpl(artifacts, resolver, createOp);
}

export function templateCompilationContext(
  program: CompileTimeCompilationContext,
  meta: ContainingMetadata
): TemplateCompilationContext {
  let encoder = new EncoderImpl(program.heap, meta, program.stdlib);

  return {
    program,
    encoder,
    meta,
  };
}
