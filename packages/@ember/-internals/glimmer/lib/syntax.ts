// import { assert } from '@ember/debug';
import { Core, MacroContext, Macros, Option, StatementCompileActions, Unhandled, NamedBlocks } from '@glimmer/interfaces';
import { assert } from '@ember/debug';
import CompileTimeResolver from './compile-time-lookup';
import { staticComponent, NONE } from '@glimmer/opcode-compiler';
// import { Option } from '@glimmer/util';
// import CompileTimeLookup from './compile-time-lookup';
// import { blockLetMacro } from './syntax/let';
import { mountMacro } from './syntax/mount';
import { outletMacro } from './syntax/outlet';
import { hashToArgs } from './syntax/utils';
import { UNHANDLED, EMPTY_BLOCKS } from '@glimmer/opcode-compiler';
import { OwnedTemplateMeta } from '@ember/-internals/views';

export const experimentalMacros: any[] = [];

// This is a private API to allow for experimental macros
// to be created in user space. Registering a macro should
// should be done in an initializer.
export function registerMacros(macro: any) {
  experimentalMacros.push(macro);
}

function refineInlineSyntax(
  name: string,
  params: Option<Core.Params>,
  hash: Option<Core.Hash>,
  context: MacroContext
): StatementCompileActions | Unhandled {
  let component = context.resolver.lookupComponent(name, context.meta.referrer);

  if (component !== null) {
    return staticComponent(component, [params === null ? [] : params, hashToArgs(hash), EMPTY_BLOCKS]);
  }

  return UNHANDLED;
}

function refineBlockSyntax(
  name: string,
  params: Core.Params,
  hash: Core.Hash,
  blocks: NamedBlocks,
  context: MacroContext
): StatementCompileActions {
  let handle = context.resolver.lookupComponent(name, context.meta.referrer);

  if (handle !== null) {
    return staticComponent(handle, [params, hashToArgs(hash), blocks]);
  }

  assert(
    `A component or helper named "${name}" could not be found`,
    (context.meta.referrer as OwnedTemplateMeta).owner.hasRegistration(`helper:${name}`)
  );

  assert(
    `Helpers may not be used in the block form, for example {{#${name}}}{{/${name}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${name})}}{{/if}}.`,
    !(() => {
      const resolver = context.resolver['resolver'];
      const { owner, moduleName } = context.meta.referrer as OwnedTemplateMeta;
      if (name === 'component' || resolver['builtInHelpers'][name]) {
        return true;
      }
      let options = { source: `template:${moduleName}` };
      return (
        owner.hasRegistration(`helper:${name}`, options) || owner.hasRegistration(`helper:${name}`)
      );
    })()
  );

  return NONE;
}

export function populateMacros(macros: Macros) {
  let { inlines, blocks } = macros;
  // inlines.add('outlet', outletMacro);
  // inlines.add('mount', mountMacro);

  inlines.addMissing(refineInlineSyntax);

  // blocks.add('let', blockLetMacro);
  blocks.addMissing(refineBlockSyntax);

  for (let i = 0; i < experimentalMacros.length; i++) {
    let macro = experimentalMacros[i];
    macro(blocks, inlines);
  }

  return { blocks, inlines };
}
