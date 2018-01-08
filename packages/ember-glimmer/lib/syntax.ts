import { CompilableBlock, Macros, OpcodeBuilder } from '@glimmer/opcode-compiler';
import { Option } from '@glimmer/util';
import { Core } from '@glimmer/wire-format';
import { ENV } from 'ember-environment';
import { OwnedTemplateMeta } from 'ember-views';
import { textAreaMacro } from './syntax/-text-area';
import { inputMacro } from './syntax/input';
import { mountMacro } from './syntax/mount';
import { outletMacro } from './syntax/outlet';
import { renderMacro } from './syntax/render';
import { hashToArgs } from './syntax/utils';
import { blockLetMacro } from './syntax/let';
import { wrapComponentClassAttribute } from './utils/bindings';
import { EMBER_TEMPLATE_BLOCK_LET_HELPER } from 'ember/features';

function refineInlineSyntax(name: string, params: Option<Core.Params>, hash: Option<Core.Hash>, builder: OpcodeBuilder<OwnedTemplateMeta>): boolean {
  // assert(`You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`, !(builder.resolver.resolver.builtInHelpers[name] && builder.resolver.resolver.owner.hasRegistration(`helper:${name}`)));
  if (name.indexOf('-') === -1) {
    return false;
  }

  let handle = builder.resolver.lookupComponentDefinition(name, builder.referrer);

  if (handle !== null) {
    builder.component.static(handle, [params === null ? [] : params, hashToArgs(hash), null, null]);
    return true;
  }

  return false;
}

function refineBlockSyntax(name: string, params: Core.Params, hash: Core.Hash, template: Option<CompilableBlock>, inverse: Option<CompilableBlock>, builder: OpcodeBuilder<OwnedTemplateMeta>) {
  if (name.indexOf('-') === -1) {
    return false;
  }

  let handle = builder.resolver.lookupComponentDefinition(name, builder.referrer);

  if (handle !== null) {
    wrapComponentClassAttribute(hash);
    builder.component.static(handle, [params, hashToArgs(hash), template, inverse]);
    return true;
  }

  // assert(`A component or helper named "${name}" could not be found`, builder.resolver.hasHelper(name, builder.referrer));

  // assert(`Helpers may not be used in the block form, for example {{#${name}}}{{/${name}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${name})}}{{/if}}.`, !builder.env.hasHelper(name, meta));

  return false;
}

export const experimentalMacros: any[] = [];

// This is a private API to allow for experimental macros
// to be created in user space. Registering a macro should
// should be done in an initializer.
export function registerMacros(macro: any) {
  experimentalMacros.push(macro);
}

export function populateMacros(macros: Macros) {
  let { inlines, blocks } = macros;
  inlines.add('outlet', outletMacro);

  if (ENV._ENABLE_RENDER_SUPPORT === true) {
    inlines.add('render', renderMacro);
  }

  inlines.add('mount', mountMacro);
  inlines.add('input', inputMacro);
  inlines.add('textarea', textAreaMacro);
  inlines.addMissing(refineInlineSyntax);
<<<<<<< HEAD
  // blocks.add('component', blockComponentMacro);
=======
  blocks.add('component', blockComponentMacro);
  if (EMBER_TEMPLATE_BLOCK_LET_HELPER === true) {
    blocks.add('let', blockLetMacro);
  }
>>>>>>> origin/master
  blocks.addMissing(refineBlockSyntax);

  for (let i = 0; i < experimentalMacros.length; i++) {
    let macro = experimentalMacros[i];
    macro(blocks, inlines);
  }

  return { blocks, inlines };
}
