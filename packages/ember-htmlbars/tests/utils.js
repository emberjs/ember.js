import plugins, { registerPlugin } from 'ember-template-compiler/plugins';

function registerAstPlugin(plugin) {
  registerPlugin('ast', plugin);
}

function removeAstPlugin(plugin) {
  const index = plugins['ast'].indexOf(plugin);
  plugins['ast'].splice(index, 1);
}

export {
  registerAstPlugin,
  removeAstPlugin
};
