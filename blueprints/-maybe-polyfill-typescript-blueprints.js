const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');
const EMBER_TYPESCRIPT_BLUEPRINTS = true;

function canEmitTypeScript() {
  return 'EMBER_TYPESCRIPT_BLUEPRINTS' in process.env
    ? process.env.EMBER_TYPESCRIPT_BLUEPRINTS === 'true'
    : EMBER_TYPESCRIPT_BLUEPRINTS;
}

module.exports = function (context) {
  let canUseTypeScript = canEmitTypeScript();
  if (canUseTypeScript) {
    typescriptBlueprintPolyfill(context);
  } else {
    // Use the plain old JS templates from before
    context.path = context.path.replace('blueprints', 'blueprints-js');
  }
  return canUseTypeScript;
};
