import { renderMacro } from './syntax/render';
import { outletMacro } from './syntax/outlet';
import { mountMacro } from './syntax/mount';
import {
  blockComponentMacro,
  inlineComponentMacro,
  closureComponentMacro
} from './syntax/dynamic-component';
import { wrapComponentClassAttribute } from './utils/bindings';
import { _withDynamicVarsMacro } from './syntax/-with-dynamic-vars';
import { _inElementMacro } from './syntax/-in-element';
import { inputMacro } from './syntax/input';
import { textAreaMacro } from './syntax/-text-area';
import { assert } from 'ember-metal';

function refineInlineSyntax(path, params, hash, builder) {
  let [ name ] = path;

  assert(`You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`, !(builder.env.builtInHelpers[name] && builder.env.owner.hasRegistration(`helper:${name}`)));

  if (path.length > 1) {
    return closureComponentMacro(path, params, hash, null, null, builder);
  }

  let { symbolTable } = builder;

  let definition;
  if (name.indexOf('-') > -1) {
    definition = builder.env.getComponentDefinition(path, symbolTable);
  }

  if (definition) {
    wrapComponentClassAttribute(hash);
    builder.component.static(definition, [params, hash, null, null], symbolTable);
    return true;
  }

  return false;
}

function refineBlockSyntax(sexp, builder) {
  let [, path, params, hash, _default, inverse] = sexp;
  let [ name ] = path;

  if (path.length > 1) {
    return closureComponentMacro(path, params, hash, _default, inverse, builder);
  }

  if (name.indexOf('-') === -1) {
    return false;
  }

  let { symbolTable } = builder;
  let definition;
  if (name.indexOf('-') > -1) {
    definition = builder.env.getComponentDefinition(path, symbolTable);
  }

  if (definition) {
    wrapComponentClassAttribute(hash);
    builder.component.static(definition, [params, hash, _default, inverse], symbolTable);
    return true;
  }

  assert(`A component or helper named "${name}" could not be found`, builder.env.hasHelper(path, symbolTable));

  assert(`Helpers may not be used in the block form, for example {{#${name}}}{{/${name}}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (${name})}}{{/if}}.`, !builder.env.hasHelper(path, symbolTable));

  return false;
}

let experimentalMacros = [];

// This is a private API to allow for expiremental macros
// to be created in user space. Registering a macro should
// should be done in an initializer.
export function registerMacros(macro) {
  experimentalMacros.push(macro);
}

export function populateMacros(blocks, inlines) {
  inlines.add('outlet', outletMacro);
  inlines.add('component', inlineComponentMacro);
  inlines.add('render', renderMacro);
  inlines.add('mount', mountMacro);
  inlines.add('input', inputMacro);
  inlines.add('textarea', textAreaMacro);
  inlines.addMissing(refineInlineSyntax);
  blocks.add('component', blockComponentMacro);
  blocks.add('-with-dynamic-vars', _withDynamicVarsMacro);
  blocks.add('-in-element', _inElementMacro);
  blocks.addMissing(refineBlockSyntax);

  for (let i = 0; i < experimentalMacros.length; i++) {
    let macro = experimentalMacros[i];
    macro(blocks, inlines);
  }

  experimentalMacros = [];

  return { blocks, inlines };
}
