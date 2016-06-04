/**
@module ember
@submodule ember-htmlbars
*/

import VERSION from 'ember/version';
import assign from 'ember-metal/assign';
import defaultPlugins from 'ember-template-compiler/plugins';
import TransformClosureComponentAttrsIntoMut from '../plugins/transform-closure-component-attrs-into-mut';
import TransformComponentAttrsIntoMut from '../plugins/transform-component-attrs-into-mut';
import TransformComponentCurlyToReadonly from '../plugins/transform-component-curly-to-readonly';
import TransformOldClassBindingSyntax from '../plugins/transform-old-class-binding-syntax';

let compileOptions;

export let PLUGINS = [
  ...defaultPlugins,

  // the following are ember-htmlbars specific
  TransformClosureComponentAttrsIntoMut,
  TransformComponentAttrsIntoMut,
  TransformComponentCurlyToReadonly,
  TransformOldClassBindingSyntax
];

let USER_PLUGINS = [];

function mergePlugins(options) {
  options = options || {};
  options = assign({}, options);
  if (!options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...PLUGINS] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...PLUGINS];
    let pluginsToAdd = potententialPugins.filter((plugin) => {
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

  if (USER_PLUGINS.indexOf(PluginClass) === -1) {
    USER_PLUGINS = [PluginClass, ...USER_PLUGINS];
  }
}

export function removePlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  USER_PLUGINS = USER_PLUGINS.filter((plugin) => plugin !== PluginClass);
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
      revision: 'Ember@' + VERSION,
      loc: program.loc,
      moduleName: options.moduleName
    };
  };

  return options;
};

export default compileOptions;
