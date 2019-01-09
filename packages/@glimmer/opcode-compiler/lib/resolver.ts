import {
  ResolvedLayout,
  Option,
  CompilableProgram,
  MaybeResolvedLayout,
  CompileTimeResolverDelegate,
} from '@glimmer/interfaces';
import { MacroContext } from './syntax/macros';

export function resolveLayoutForTag(
  tag: string,
  { resolver, meta: { referrer } }: MacroContext
): MaybeResolvedLayout {
  let handle = resolver.lookupComponentDefinition(tag, referrer);

  if (handle === null) return { handle: null, capabilities: null, compilable: null };

  return resolveLayoutForHandle(resolver, handle);
}

export function resolveLayoutForHandle(
  resolver: CompileTimeResolverDelegate,
  handle: number
): ResolvedLayout {
  let capabilities = resolver.getCapabilities(handle);
  let compilable: Option<CompilableProgram> = null;

  if (!capabilities.dynamicLayout) {
    compilable = resolver.getLayout(handle)!;
  }

  return {
    handle,
    capabilities,
    compilable,
  };
}
