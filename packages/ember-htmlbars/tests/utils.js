import keywords, { registerKeyword as _registerKeyword } from 'ember-htmlbars/keywords';
import plugins, { registerPlugin } from 'ember-template-compiler/plugins';

function registerAstPlugin(plugin) {
  registerPlugin('ast', plugin);
}

function removeAstPlugin(plugin) {
  let index = plugins['ast'].indexOf(plugin);
  plugins['ast'].splice(index, 1);
}

function registerKeyword(name, keyword) {
  return _registerKeyword(name, keyword);
}

function resetKeyword(name, original) {
  if (original) {
    keywords[name] = original;
  } else {
    delete keywords[name];
  }
}

export {
  registerAstPlugin,
  removeAstPlugin,
  registerKeyword,
  resetKeyword
};
