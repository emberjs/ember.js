const { dasherize } = require('ember-cli-string-utils');
const { EOL } = require('os');

function generateComponentSignature(componentName) {
  let args = `  // The arguments accepted by the component${EOL}  Args: {};`;

  let blocks =
    `  // Any blocks yielded by the component${EOL}` +
    `  Blocks: {${EOL}` +
    `    default: []${EOL}` +
    `  };`;

  let element =
    `  // The element to which \`...attributes\` is applied in the component template${EOL}` +
    `  Element: null;`;

  return (
    `export interface ${componentName}Signature {${EOL}` +
    `${args}${EOL}` +
    `${blocks}${EOL}` +
    `${element}${EOL}` +
    `}${EOL}`
  );
}

function modulePrefixForProject(project) {
  return dasherize(project.config().modulePrefix);
}

module.exports = {
  generateComponentSignature,
  modulePrefixForProject,
};
