const { dasherize } = require('ember-cli-string-utils');

function modulePrefixForProject(project) {
  return dasherize(project.config().modulePrefix);
}

module.exports = {
  modulePrefixForProject,
};
