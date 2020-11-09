import { ResolvedLayout, Option } from '@glimmer/interfaces';
import { MacroContext } from './syntax/macros';
import { MINIMAL_CAPABILITIES } from './opcode-builder/delegate';
import { expect } from '@glimmer/util';

export function resolveLayoutForTag(
  tag: string,
  { resolver, meta: { owner } }: MacroContext
): Option<ResolvedLayout> {
  let component = resolver.lookupComponent(
    tag,
    expect(owner, 'expected an owner to be associated with this template')
  );
  if (component === null) return component;
  let { handle, compilable, capabilities } = component;

  return {
    handle,
    compilable,
    capabilities: capabilities || MINIMAL_CAPABILITIES,
  };
}
