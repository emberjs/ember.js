const semver = require('semver');
const { version } = require('../package.json');

/*
  `appEmberSatisfies` from @embroider/macros reads the ember-source version
  from the dependencies of the app.

  In this repo the app is ember-source, and a package cannot depend on itself.
  So this plugin answers the macro with the version of this repo, before
  @embroider/macros sees it.
*/
module.exports = function appEmberSatisfiesPlugin({ types: t }) {
  return {
    name: 'app-ember-satisfies',
    visitor: {
      Program(program) {
        program.traverse({
          CallExpression(call) {
            if (!call.get('callee').referencesImport('@embroider/macros', 'appEmberSatisfies')) {
              return;
            }

            let [range] = call.node.arguments;
            let satisfied = semver.satisfies(version, range.value, { includePrerelease: true });

            call.replaceWith(t.booleanLiteral(satisfied));
          },
        });
      },
    },
  };
};
