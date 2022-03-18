'use strict';

const Project = require('./fixtures/project');
const Overrides = require('../../lib/overrides');

function cmp(a, b) {
  if (a == undefined || a < b) {
    return -1;
  } else if (b == undefined || a > b) {
    return 1;
  } else {
    return 0;
  }
}

function addonsInfoFor(project) {
  if (!(project instanceof Project)) {
    project = new Project(project);
  }

  let addonsInfo = [...Overrides.addonsInfoFor(project)];

  addonsInfo.sort((a, b) => cmp(a.topLevel, b.topLevel) || cmp(a.parent, b.parent));

  return addonsInfo;
}

function fullExample() {
  return {
    name: 'direwolf',
    devDependencies: {
      'active-model-adapter': '^2.2.0',
      'ember-animated': '^0.11.0',
      'ember-cli-babel': '^7.26.3',
      'ember-fetch': '^8.0.5',
      'ember-source': 'link:3.27.3',
    },
    addons: [
      {
        name: 'active-model-adapter',
        dependencies: {
          'ember-cli-babel': '^6.18.0',
        },
      },
      {
        name: 'ember-animated',
        dependencies: {
          'ember-angle-bracket-invocation-polyfill': '^2.0.0',
          'ember-cli-babel': '^7.26.3',
        },
        addons: [
          {
            name: 'ember-angle-bracket-invocation-polyfill',
            dependencies: {
              'ember-cli-babel': '^6.16.0',
            },
            addons: [
              {
                name: 'ember-cli-babel',
                version: '6.18.0',
              },
            ],
          },
          {
            name: 'ember-cli-babel',
            version: '7.26.5',
          },
        ],
      },
      {
        name: 'ember-cli-babel',
        version: '7.26.5',
      },
      {
        name: 'ember-fetch',
        hasJSFiles: false,
        dependencies: {
          'ember-cli-babel': '^7.26.0',
        },
      },
      {
        name: 'ember-source',
        dependencies: {
          'ember-cli-babel': '^7.26.6',
        },
      },
    ],
  };
}

function infoForApp({
  name = 'direwolf',
  version = '7.26.6',
  requirement = `^${version}`,
  compatible = requirement.startsWith('^7'),
} = {}) {
  return {
    parent: `${name} (your app)`,
    topLevel: null,
    version,
    requirement,
    compatible,
    dormant: false,
    path: [],
  };
}

// function info({
//   parent,
//   topLevel = parent,
//   version = '7.26.6',
//   requirement = `^${version}`,
//   compatible = requirement.startsWith('^7'),
//   dormant = false,
//   path = [`${parent}@${version}`],
// } = {}) {
//   return {
//     parent,
//     topLevel,
//     version,
//     requirement,
//     compatible,
//     dormant,
//     path,
//   };
// }

QUnit.module('Overrides', function () {
  QUnit.module('.addonsInfoFor', function () {
    // app

    QUnit.test('it returns old babel added by app', function (assert) {
      assert.deepEqual(addonsInfoFor({ emberCliBabel: '^6.0.0' }), [
        {
          parent: 'my-app (your app)',
          topLevel: null,
          version: '6.0.0',
          requirement: '^6.0.0',
          compatible: false,
          dormant: false,
          path: [],
        },
      ]);
    });

    QUnit.test('it returns old but compatible babel added by app', function (assert) {
      assert.deepEqual(addonsInfoFor({ emberCliBabel: '^7.0.0' }), [
        {
          parent: 'my-app (your app)',
          topLevel: null,
          version: '7.0.0',
          requirement: '^7.0.0',
          compatible: true,
          dormant: false,
          path: [],
        },
      ]);
    });

    QUnit.test('it does not return new babel added by app', function (assert) {
      assert.deepEqual(addonsInfoFor({ emberCliBabel: '^7.26.6' }), []);
    });

    // direct dependency

    QUnit.test('it returns old babel added by a dependency', function (assert) {
      assert.deepEqual(addonsInfoFor(Project.withDep({ emberCliBabel: '^6.0.0' })), [
        {
          parent: 'my-addon@1.0.0',
          topLevel: 'my-addon',
          version: '6.0.0',
          requirement: '^6.0.0',
          compatible: false,
          dormant: false,
          path: ['my-addon@1.0.0'],
        },
      ]);
    });

    QUnit.test('it returns old but compatible babel added by a dependency', function (assert) {
      assert.deepEqual(addonsInfoFor(Project.withDep({ emberCliBabel: '^7.0.0' })), [
        {
          parent: 'my-addon@1.0.0',
          topLevel: 'my-addon',
          version: '7.0.0',
          requirement: '^7.0.0',
          compatible: true,
          dormant: false,
          path: ['my-addon@1.0.0'],
        },
      ]);
    });

    QUnit.test('it does not return new babel added by a dependency', function (assert) {
      assert.deepEqual(addonsInfoFor(Project.withDep({ emberCliBabel: '^7.26.6' })), []);
    });

    // direct dependency (dormant)

    QUnit.test('it returns old babel added by a dormant dependency', function (assert) {
      assert.deepEqual(
        addonsInfoFor(Project.withDep({ emberCliBabel: '^6.0.0', hasJSFiles: false })),
        [
          {
            parent: 'my-addon@1.0.0',
            topLevel: 'my-addon',
            version: '6.0.0',
            requirement: '^6.0.0',
            compatible: false,
            dormant: true,
            path: ['my-addon@1.0.0'],
          },
        ]
      );
    });

    QUnit.test(
      'it returns old but compatible babel added by a dormant dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(Project.withDep({ emberCliBabel: '^7.0.0', hasJSFiles: false })),
          [
            {
              parent: 'my-addon@1.0.0',
              topLevel: 'my-addon',
              version: '7.0.0',
              requirement: '^7.0.0',
              compatible: true,
              dormant: true,
              path: ['my-addon@1.0.0'],
            },
          ]
        );
      }
    );

    QUnit.test('it does not return new babel added by a dormant dependency', function (assert) {
      assert.deepEqual(
        addonsInfoFor(Project.withDep({ emberCliBabel: '^7.26.6', hasJSFiles: false })),
        []
      );
    });

    // transient dep

    QUnit.test('it returns old babel added by a transient dependency', function (assert) {
      assert.deepEqual(addonsInfoFor(Project.withTransientDep({ emberCliBabel: '^6.0.0' })), [
        {
          parent: 'my-nested-addon@0.1.0',
          topLevel: 'my-addon',
          version: '6.0.0',
          requirement: '^6.0.0',
          compatible: false,
          dormant: false,
          path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
        },
      ]);
    });

    QUnit.test(
      'it returns old but compatible babel added by a transient dependency',
      function (assert) {
        assert.deepEqual(addonsInfoFor(Project.withTransientDep({ emberCliBabel: '^7.0.0' })), [
          {
            parent: 'my-nested-addon@0.1.0',
            topLevel: 'my-addon',
            version: '7.0.0',
            requirement: '^7.0.0',
            compatible: true,
            dormant: false,
            path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
          },
        ]);
      }
    );

    QUnit.test('it does not return new babel added by a transient dependency', function (assert) {
      assert.deepEqual(addonsInfoFor(Project.withDep({ emberCliBabel: '^7.26.6' })), []);
    });

    // dormant transient dep

    QUnit.test('it returns old babel added by a dormant transient dependency', function (assert) {
      assert.deepEqual(
        addonsInfoFor(Project.withTransientDep({ emberCliBabel: '^6.0.0', hasJSFiles: false })),
        [
          {
            parent: 'my-nested-addon@0.1.0',
            topLevel: 'my-addon',
            version: '6.0.0',
            requirement: '^6.0.0',
            compatible: false,
            dormant: true,
            path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
          },
        ]
      );
    });

    QUnit.test(
      'it returns old but compatible babel added by a dormant transient dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(Project.withTransientDep({ emberCliBabel: '^7.0.0', hasJSFiles: false })),
          [
            {
              parent: 'my-nested-addon@0.1.0',
              topLevel: 'my-addon',
              version: '7.0.0',
              requirement: '^7.0.0',
              compatible: true,
              dormant: true,
              path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
            },
          ]
        );
      }
    );

    QUnit.test(
      'it does not return new babel added by a dormant transient dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(Project.withDep({ emberCliBabel: '^7.26.6', hasJSFiles: false })),
          []
        );
      }
    );

    // transient dep through a dormant dep

    QUnit.test(
      'it returns old babel added by a transient dependency through a dormant dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(
            Project.withTransientDep({ emberCliBabel: '^6.0.0' }, { hasJSFiles: false })
          ),
          [
            {
              parent: 'my-nested-addon@0.1.0',
              topLevel: 'my-addon',
              version: '6.0.0',
              requirement: '^6.0.0',
              compatible: false,
              dormant: false,
              path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
            },
          ]
        );
      }
    );

    QUnit.test(
      'it returns old but compatible babel added by a transient dependency through a dormant dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(
            Project.withTransientDep({ emberCliBabel: '^7.0.0' }, { hasJSFiles: false })
          ),
          [
            {
              parent: 'my-nested-addon@0.1.0',
              topLevel: 'my-addon',
              version: '7.0.0',
              requirement: '^7.0.0',
              compatible: true,
              dormant: false,
              path: ['my-addon@1.0.0', 'my-nested-addon@0.1.0'],
            },
          ]
        );
      }
    );

    QUnit.test(
      'it does not return new babel added by a transient dependency through a dormant dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(Project.withDep({ emberCliBabel: '^7.26.6' }, { hasJSFiles: false })),
          []
        );
      }
    );

    // linked dep

    QUnit.test('it returns old babel added by a linked dependency', function (assert) {
      assert.deepEqual(
        addonsInfoFor(
          new Project({
            devDependencies: {
              'ember-source': 'link:3.27.3',
            },
            addons: [
              {
                name: 'ember-source',
                emberCliBabel: '^6.0.0',
              },
            ],
          })
        ),
        [
          {
            parent: 'ember-source@3.27.3',
            topLevel: 'ember-source',
            version: '6.0.0',
            requirement: '^6.0.0',
            compatible: false,
            dormant: false,
            path: ['ember-source@3.27.3'],
          },
        ]
      );
    });

    QUnit.test(
      'it returns old but compatible babel added by a linked dependency',
      function (assert) {
        assert.deepEqual(
          addonsInfoFor(
            new Project({
              devDependencies: {
                'ember-source': 'link:3.27.3',
              },
              addons: [
                {
                  name: 'ember-source',
                  emberCliBabel: '^7.0.0',
                },
              ],
            })
          ),
          [
            {
              parent: 'ember-source@3.27.3',
              topLevel: 'ember-source',
              version: '7.0.0',
              requirement: '^7.0.0',
              compatible: true,
              dormant: false,
              path: ['ember-source@3.27.3'],
            },
          ]
        );
      }
    );

    QUnit.test('it does not return new babel added by a linked dependency', function (assert) {
      assert.deepEqual(
        addonsInfoFor(
          new Project({
            devDependencies: {
              'ember-source': 'link:3.27.3',
            },
            addons: [
              {
                name: 'ember-source',
                emberCliBabel: '^7.26.6',
              },
            ],
          })
        ),
        []
      );
    });

    // full example

    QUnit.test('full example', function (assert) {
      let project = new Project(fullExample());

      assert.deepEqual(addonsInfoFor(project), [
        {
          parent: 'direwolf (your app)',
          topLevel: null,
          version: '7.26.5',
          requirement: '^7.26.3',
          compatible: true,
          dormant: false,
          path: [],
        },
        {
          parent: 'active-model-adapter@2.2.0',
          topLevel: 'active-model-adapter',
          version: '6.18.0',
          requirement: '^6.18.0',
          compatible: false,
          dormant: false,
          path: ['active-model-adapter@2.2.0'],
        },
        {
          parent: 'ember-angle-bracket-invocation-polyfill@2.0.0',
          topLevel: 'ember-animated',
          version: '6.18.0',
          requirement: '^6.16.0',
          compatible: false,
          dormant: true,
          path: ['ember-animated@0.11.0', 'ember-angle-bracket-invocation-polyfill@2.0.0'],
        },
        {
          parent: 'ember-animated@0.11.0',
          topLevel: 'ember-animated',
          version: '7.26.5',
          requirement: '^7.26.3',
          compatible: true,
          dormant: false,
          path: ['ember-animated@0.11.0'],
        },
        {
          parent: 'ember-fetch@8.0.5',
          topLevel: 'ember-fetch',
          version: '7.26.0',
          requirement: '^7.26.0',
          compatible: true,
          dormant: true,
          path: ['ember-fetch@8.0.5'],
        },
      ]);
    });
  });

  QUnit.module('.printList', function () {
    QUnit.test('it can print a flat list', function (assert) {
      assert.equal(
        Overrides.printList(['first', 'second', 'third'], '        '),
        `\
        * first
        * second
        * third
`
      );
    });

    QUnit.test('it can print a nested list', function (assert) {
      assert.equal(
        Overrides.printList(
          [
            'first',
            [
              'second',
              ['second.1', ['second.2', ['second.2.1', 'second.2.2', 'second.2.3']], 'second.3'],
            ],
            'third',
          ],
          '        '
        ),
        `\
        * first
        * second
          * second.1
          * second.2
            * second.2.1
            * second.2.2
            * second.2.3
          * second.3
        * third
`
      );
    });
  });

  QUnit.test('it does nothing when in production', function (assert) {
    let project = new Project(fullExample());
    let overrides = Overrides.for(project, { EMBER_ENV: 'production' });

    assert.false(overrides.hasOverrides, 'hasOverrides');
    assert.false(overrides.hasBuildTimeWarning, 'hasBuildTimeWarning');
  });

  QUnit.test('it does nothing when everything is on new babel', function (assert) {
    let overrides = new Overrides([]);

    assert.false(overrides.hasOverrides, 'hasOverrides');
    assert.false(overrides.hasBuildTimeWarning, 'hasBuildTimeWarning');
  });

  QUnit.test('when app is on old babel', function (assert) {
    let overrides = new Overrides([infoForApp({ version: '6.0.0' })]);

    assert.true(overrides.hasOverrides, 'hasOverrides');
    assert.true(overrides.hasBuildTimeWarning, 'hasBuildTimeWarning');
    assert.true(overrides.hasActionableSuggestions, 'hasActionableSuggestions');
    assert.false(overrides.hasCompatibleAddons, 'hasCompatibleAddons');
    assert.false(overrides.hasDormantAddons, 'hasDormantAddons');
  });

  // let project, env;

  // function buildBabel(parent, version) {
  //   return {
  //     name: 'ember-cli-babel',
  //     parent,
  //     pkg: {
  //       version,
  //     },
  //     addons: [],
  //   };
  // }

  // hooks.beforeEach(function () {
  //   project = {
  //     name() {
  //       return 'fake-project';
  //     },
  //     pkg: {
  //       dependencies: {},
  //       devDependencies: {},
  //     },
  //     addons: [],
  //   };
  //   env = Object.create(null);
  // });

  // hooks.afterEach(function () {});

  // QUnit.test('when in production, does nothing', function (assert) {
  //   env.EMBER_ENV = 'production';

  //   let result = globalDeprecationInfo(project, env);

  //   assert.deepEqual(result, {
  //     globalMessage: '',
  //     hasActionableSuggestions: false,
  //     shouldIssueSingleDeprecation: false,
  //     bootstrap: `require('@ember/-internals/bootstrap').default()`,
  //   });
  // });

  // QUnit.test('without addons, does nothing', function (assert) {
  //   project.addons = [];
  //   let result = globalDeprecationInfo(project, env);

  //   assert.deepEqual(result, {
  //     globalMessage: '',
  //     hasActionableSuggestions: false,
  //     shouldIssueSingleDeprecation: false,
  //     bootstrap: `require('@ember/-internals/bootstrap').default()`,
  //   });
  // });

  // QUnit.test('projects own ember-cli-babel is too old', function (assert) {
  //   project.pkg.devDependencies = {
  //     'ember-cli-babel': '^7.26.0',
  //   };

  //   project.addons.push({
  //     name: 'ember-cli-babel',
  //     parent: project,
  //     pkg: {
  //       version: '7.26.5',
  //     },
  //     addons: [],
  //   });

  //   let result = globalDeprecationInfo(project, env);
  //   assert.strictEqual(result.shouldIssueSingleDeprecation, true);
  //   assert.strictEqual(result.hasActionableSuggestions, true);
  //   assert.ok(
  //     result.globalMessage.includes(
  //       '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
  //     )
  //   );
  // });

  // QUnit.test('projects has ember-cli-babel in dependencies', function (assert) {
  //   project.pkg.dependencies = {
  //     'ember-cli-babel': '^7.25.0',
  //   };

  //   project.addons.push({
  //     name: 'ember-cli-babel',
  //     parent: project,
  //     pkg: {
  //       version: '7.26.5',
  //     },
  //     addons: [],
  //   });

  //   let result = globalDeprecationInfo(project, env);
  //   assert.strictEqual(result.shouldIssueSingleDeprecation, true);
  //   assert.strictEqual(result.hasActionableSuggestions, true);
  //   assert.ok(
  //     result.globalMessage.includes(
  //       '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
  //     )
  //   );
  // });
  // QUnit.test(
  //   'projects has no devDependencies, but old ember-cli-babel found in addons array',
  //   function (assert) {
  //     project.pkg.devDependencies = {};

  //     project.addons.push({
  //       name: 'ember-cli-babel',
  //       parent: project,
  //       pkg: {
  //         version: '7.26.5',
  //       },
  //       addons: [],
  //     });

  //     let result = globalDeprecationInfo(project, env);
  //     assert.strictEqual(result.shouldIssueSingleDeprecation, true);
  //     assert.strictEqual(result.hasActionableSuggestions, true);
  //     assert.ok(
  //       result.globalMessage.includes(
  //         '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
  //       )
  //     );
  //   }
  // );

  // QUnit.test('projects uses linked ember-cli-babel', function (assert) {
  //   project.pkg.devDependencies = {
  //     'ember-cli-babel': 'link:./some/path/here',
  //   };

  //   let otherAddon = {
  //     name: 'other-thing-here',
  //     parent: project,
  //     pkg: {},
  //     addons: [],
  //   };

  //   otherAddon.addons.push(buildBabel(otherAddon, '7.26.5'));
  //   project.addons.push(buildBabel(project, '7.26.6'), otherAddon);

  //   let result = globalDeprecationInfo(project, env);
  //   assert.strictEqual(result.shouldIssueSingleDeprecation, true);
  //   assert.strictEqual(result.hasActionableSuggestions, true);

  //   assert.ok(
  //     result.globalMessage.includes(
  //       '* If using yarn, run `npx yarn-deduplicate --packages ember-cli-babel`'
  //     )
  //   );
  //   assert.ok(result.globalMessage.includes('* If using npm, run `npm dedupe`'));
  // });

  // QUnit.test('projects own ember-cli-babel is up to date', function (assert) {
  //   project.pkg.devDependencies = {
  //     'ember-cli-babel': '^7.26.0',
  //   };

  //   project.addons.push({
  //     name: 'ember-cli-babel',
  //     parent: project,
  //     pkg: {
  //       version: '7.26.6',
  //     },
  //     addons: [],
  //   });

  //   let result = globalDeprecationInfo(project, env);
  //   assert.strictEqual(result.shouldIssueSingleDeprecation, false);
  //   assert.strictEqual(result.hasActionableSuggestions, false);
  //   assert.notOk(
  //     result.globalMessage.includes(
  //       '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
  //     )
  //   );
  // });

  // QUnit.test('transient babel that is out of date', function (assert) {
  //   project.pkg.devDependencies = {
  //     'ember-cli-babel': '^7.26.0',
  //   };

  //   let otherAddon = {
  //     name: 'other-thing-here',
  //     parent: project,
  //     pkg: {
  //       dependencies: {
  //         'ember-cli-babel': '^7.25.0',
  //       },
  //     },
  //     addons: [],
  //   };

  //   otherAddon.addons.push(buildBabel(otherAddon, '7.26.5'));
  //   project.addons.push(buildBabel(project, '7.26.6'), otherAddon);

  //   let result = globalDeprecationInfo(project, env);
  //   assert.strictEqual(result.shouldIssueSingleDeprecation, true);
  //   assert.strictEqual(result.hasActionableSuggestions, true);
  //   assert.ok(result.globalMessage.includes('* other-thing-here@7.26.5 (Compatible)'));
  // });
});
