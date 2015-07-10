/**
@module ember
@submodule ember-template-compiler
*/

import isEnabled from 'ember-metal/features';
import { assign } from 'ember-metal/merge';
import defaultPlugins from 'ember-template-compiler/plugins';

/**
  @private
  @property compileOptions
*/
export default function(_options) {
  var disableComponentGeneration = true;
  if (isEnabled('ember-htmlbars-component-generation')) {
    disableComponentGeneration = false;
  }

  let options;
  // When calling `Ember.Handlebars.compile()` a second argument of `true`
  // had a special meaning (long since lost), this just gaurds against
  // `options` being true, and causing an error during compilation.
  if (_options === true) {
    options = {};
  } else {
    options = assign({}, _options);
  }

  options.disableComponentGeneration = disableComponentGeneration;

  let plugins = {
    ast: defaultPlugins.ast.slice()
  };

  if (options.plugins && options.plugins.ast) {
    plugins.ast = plugins.ast.concat(options.plugins.ast);
  }
  options.plugins = plugins;

  options.buildMeta = function buildMeta(program) {
    return {
      topLevel: detectTopLevel(program),
      revision: 'Ember@VERSION_STRING_PLACEHOLDER',
      loc: program.loc,
      moduleName: options.moduleName
    };
  };

  return options;
}

function detectTopLevel(program) {
  let { loc, body } = program;
  if (!loc || loc.start.line !== 1 || loc.start.column !== 0) { return null; }

  let lastComponentNode;
  let lastIndex;
  let nodeCount = 0;

  for (let i = 0, l = body.length; i < l; i++) {
    let curr = body[i];

    // text node with whitespace only
    if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) { continue; }

    // has multiple root elements if we've been here before
    if (nodeCount++ > 0) { return false; }

    if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
      lastComponentNode = curr;
      lastIndex = i;
    }
  }

  if (!lastComponentNode) { return null; }

  if (lastComponentNode.type === 'ComponentNode') {
    let tag = lastComponentNode.tag;
    if (tag.charAt(0) !== '<') { return null; }
    return tag.slice(1, -1);
  }

  return null;
}
