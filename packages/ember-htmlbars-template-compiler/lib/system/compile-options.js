/**
@module ember
@submodule ember-htmlbars
*/

import VERSION from 'ember/version';
import assign from 'ember-metal/assign';
import TransformClosureComponentAttrsIntoMut from '../plugins/transform-closure-component-attrs-into-mut';
import TransformComponentAttrsIntoMut from '../plugins/transform-component-attrs-into-mut';
import TransformComponentCurlyToReadonly from '../plugins/transform-component-curly-to-readonly';
import TransformOldClassBindingSyntax from '../plugins/transform-old-class-binding-syntax';

let compileOptions;
let fragmentReason;

export let PLUGINS = {
  ast: [
    TransformClosureComponentAttrsIntoMut,
    TransformComponentAttrsIntoMut,
    TransformComponentCurlyToReadonly,
    TransformOldClassBindingSyntax
  ]
};

function mergePlugins(options) {
  options = options || {};
  options = assign({}, options);
  if (!options.plugins) {
    options.plugins = PLUGINS;
  } else {
    let pluginsToAdd = PLUGINS.ast.filter((plugin) => {
      return options.plugins.ast.indexOf(plugin) === -1;
    });

    options.plugins.ast = options.plugins.ast.slice().concat(pluginsToAdd);
  }

  return options;
}

export function registerPlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to register ${PluginClass} as "${type}" which is not a valid HTMLBars plugin type.`);
  }

  if (!PLUGINS[type]) {
    PLUGINS[type] = [PluginClass];
  } else {
    PLUGINS[type].push(PluginClass);
  }
}

export function removePlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  PLUGINS.ast = PLUGINS.ast.filter((plugin) => !(plugin instanceof PluginClass));
}


/**
  @private
  @property compileOptions
*/
compileOptions = function(_options) {
  var disableComponentGeneration = true;

  let options;
  // When calling `Ember.Handlebars.compile()` a second argument of `true`
  // had a special meaning (long since lost), this just gaurds against
  // `options` being true, and causing an error during compilation.
  if (_options === true) {
    options = {};
  } else {
    options = _options || {};
  }

  options.disableComponentGeneration = disableComponentGeneration;

  options = mergePlugins(options);

  options.buildMeta = function buildMeta(program) {
    return {
      fragmentReason: fragmentReason(program),
      revision: 'Ember@' + VERSION,
      loc: program.loc,
      moduleName: options.moduleName
    };
  };

  return options;
};

fragmentReason = function(program) {
  let { loc, body } = program;
  if (!loc || loc.start.line !== 1 || loc.start.column !== 0) { return false; }

  let candidate;
  let nodeCount = 0;

  let problems = {};

  for (let i = 0; i < body.length; i++) {
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
};



export default compileOptions;
