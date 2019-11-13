// import { OwnedTemplateMeta } from '@ember/-internals/views';
// import { assert } from '@ember/debug';
import {  Macros,  } from '@glimmer/interfaces';
// import { staticComponent } from '@glimmer/opcode-compiler';
// import { Option } from '@glimmer/util';
// import CompileTimeLookup from './compile-time-lookup';
// import { blockLetMacro } from './syntax/let';
// import { mountMacro } from './syntax/mount';
// import { outletMacro } from './syntax/outlet';
// import { hashToArgs } from './syntax/utils';
// import { wrapComponentClassAttribute } from './utils/bindings';

export const experimentalMacros: any[] = [];

// This is a private API to allow for experimental macros
// to be created in user space. Registering a macro should
// should be done in an initializer.
export function registerMacros(macro: any) {
  experimentalMacros.push(macro);
}

export function populateMacros(macros: Macros) {
  let { inlines, blocks } = macros;
  // inlines.add('outlet', outletMacro);
  // inlines.add('mount', mountMacro);

  // inlines.addMissing(refineInlineSyntax);

  // blocks.add('let', blockLetMacro);
  // blocks.addMissing(refineBlockSyntax);

  for (let i = 0; i < experimentalMacros.length; i++) {
    let macro = experimentalMacros[i];
    macro(blocks, inlines);
  }

  return { blocks, inlines };
}
