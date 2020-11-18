import {
  CompileTimeResolver,
  ContainingMetadata,
  TemplateCompilationContext,
  CompileTimeArtifacts,
  CompileTimeCompilationContext,
} from '@glimmer/interfaces';
import { EncoderImpl } from './encoder';
import { CompileTimeCompilationContextImpl } from '../program-context';

export function programCompilationContext(
  artifacts: CompileTimeArtifacts,
  resolver: CompileTimeResolver
): CompileTimeCompilationContext {
  return new CompileTimeCompilationContextImpl(artifacts, resolver);
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
