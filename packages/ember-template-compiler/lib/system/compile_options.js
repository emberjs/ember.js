/**
@module ember
@submodule ember-template-compiler
*/

import isEnabled from 'ember-metal/features';
import assign from 'ember-metal/assign';
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
      fragmentReason: fragmentReason(program),
      revision: 'Ember@VERSION_STRING_PLACEHOLDER',
      loc: program.loc,
      moduleName: options.moduleName
    };
  };

  return options;
}

function fragmentReason(program) {
  let { loc, body } = program;
  if (!loc || loc.start.line !== 1 || loc.start.column !== 0) { return false; }

  let candidate;
  let nodeCount = 0;

  let problems = {};

  for (let i = 0, l = body.length; i < l; i++) {
    let curr = body[i];

    // text node with whitespace only
    if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) { continue; }

    // has multiple root elements if we've been here before
    if (nodeCount++ > 0) { problems['multiple-nodes'] = true; }

    if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
      candidate = curr;
    } else {
      problems['wrong-type'] = true;
    }
  }

  if (nodeCount === 0) {
    return { name: 'missing-wrapper', problems: ['empty-body'] };
  }

  let problemList = Object.keys(problems);
  if (problemList.length) {
    return { name: 'missing-wrapper', problems: problemList };
  }

  if (candidate.type === 'ComponentNode') {
    return false;
  } else if (candidate.modifiers.length) {
    return { name: 'modifiers', modifiers: candidate.modifiers.map(m => m.path.original) };
  } else if (candidate.attributes.some(attr => !attr.value.escaped)) {
    return { name: 'triple-curlies' };
  } else {
    return false;
  }
}
