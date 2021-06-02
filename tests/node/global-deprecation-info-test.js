'use strict';

const globalDeprecationInfo = require('../../lib/global-deprecation-utils');

QUnit.module('globalDeprecationInfo', function (hooks) {
  let project, env;

  function buildBabel(parent, version) {
    return {
      name: 'ember-cli-babel',
      parent,
      pkg: {
        version,
      },
      addons: [],
    };
  }

  hooks.beforeEach(function () {
    project = {
      name() {
        return 'fake-project';
      },
      pkg: {
        dependencies: {},
        devDependencies: {},
      },
      addons: [],
    };
    env = Object.create(null);
  });

  hooks.afterEach(function () {});

  QUnit.test('when in production, does nothing', function (assert) {
    env.EMBER_ENV = 'production';

    let result = globalDeprecationInfo(project, env);

    assert.deepEqual(result, {
      globalMessage: '',
      hasActionableSuggestions: false,
      shouldIssueSingleDeprecation: false,
      bootstrap: `require('@ember/-internals/bootstrap').default()`,
    });
  });

  QUnit.test('without addons, does nothing', function (assert) {
    project.addons = [];
    let result = globalDeprecationInfo(project, env);

    assert.deepEqual(result, {
      globalMessage: '',
      hasActionableSuggestions: false,
      shouldIssueSingleDeprecation: false,
      bootstrap: `require('@ember/-internals/bootstrap').default()`,
    });
  });

  QUnit.test('projects own ember-cli-babel is too old', function (assert) {
    project.pkg.devDependencies = {
      'ember-cli-babel': '^7.26.0',
    };

    project.addons.push({
      name: 'ember-cli-babel',
      parent: project,
      pkg: {
        version: '7.26.5',
      },
      addons: [],
    });

    let result = globalDeprecationInfo(project, env);
    assert.strictEqual(result.shouldIssueSingleDeprecation, true);
    assert.strictEqual(result.hasActionableSuggestions, true);
    assert.ok(
      result.globalMessage.includes(
        '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
      )
    );
  });

  QUnit.test('projects has ember-cli-babel in dependencies', function (assert) {
    project.pkg.dependencies = {
      'ember-cli-babel': '^7.25.0',
    };

    project.addons.push({
      name: 'ember-cli-babel',
      parent: project,
      pkg: {
        version: '7.26.5',
      },
      addons: [],
    });

    let result = globalDeprecationInfo(project, env);
    assert.strictEqual(result.shouldIssueSingleDeprecation, true);
    assert.strictEqual(result.hasActionableSuggestions, true);
    assert.ok(
      result.globalMessage.includes(
        '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
      )
    );
  });
  QUnit.test(
    'projects has no devDependencies, but old ember-cli-babel found in addons array',
    function (assert) {
      project.pkg.devDependencies = {};

      project.addons.push({
        name: 'ember-cli-babel',
        parent: project,
        pkg: {
          version: '7.26.5',
        },
        addons: [],
      });

      let result = globalDeprecationInfo(project, env);
      assert.strictEqual(result.shouldIssueSingleDeprecation, true);
      assert.strictEqual(result.hasActionableSuggestions, true);
      assert.ok(
        result.globalMessage.includes(
          '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
        )
      );
    }
  );

  QUnit.test('projects uses linked ember-cli-babel', function (assert) {
    project.pkg.devDependencies = {
      'ember-cli-babel': 'link:./some/path/here',
    };

    let otherAddon = {
      name: 'other-thing-here',
      parent: project,
      pkg: {},
      addons: [],
    };

    otherAddon.addons.push(buildBabel(otherAddon, '7.26.5'));
    project.addons.push(buildBabel(project, '7.26.6'), otherAddon);

    let result = globalDeprecationInfo(project, env);
    assert.strictEqual(result.shouldIssueSingleDeprecation, true);
    assert.strictEqual(result.hasActionableSuggestions, true);

    assert.ok(
      result.globalMessage.includes(
        '* If using yarn, run `npx yarn-deduplicate --packages ember-cli-babel`'
      )
    );
    assert.ok(result.globalMessage.includes('* If using npm, run `npm dedupe`'));
  });

  QUnit.test('projects own ember-cli-babel is up to date', function (assert) {
    project.pkg.devDependencies = {
      'ember-cli-babel': '^7.26.0',
    };

    project.addons.push({
      name: 'ember-cli-babel',
      parent: project,
      pkg: {
        version: '7.26.6',
      },
      addons: [],
    });

    let result = globalDeprecationInfo(project, env);
    assert.strictEqual(result.shouldIssueSingleDeprecation, false);
    assert.strictEqual(result.hasActionableSuggestions, false);
    assert.notOk(
      result.globalMessage.includes(
        '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`'
      )
    );
  });

  QUnit.test('transient babel that is out of date', function (assert) {
    project.pkg.devDependencies = {
      'ember-cli-babel': '^7.26.0',
    };

    let otherAddon = {
      name: 'other-thing-here',
      parent: project,
      pkg: {
        dependencies: {
          'ember-cli-babel': '^7.25.0',
        },
      },
      addons: [],
    };

    otherAddon.addons.push(buildBabel(otherAddon, '7.26.5'));
    project.addons.push(buildBabel(project, '7.26.6'), otherAddon);

    let result = globalDeprecationInfo(project, env);
    assert.strictEqual(result.shouldIssueSingleDeprecation, true);
    assert.strictEqual(result.hasActionableSuggestions, true);
    assert.ok(result.globalMessage.includes('* other-thing-here@7.26.5 (Compatible)'));
  });
});
