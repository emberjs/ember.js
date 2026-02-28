import test from 'node:test';
import assert from 'node:assert/strict';
import Overrides from '../../node_modules/ember-source/lib/overrides.js';

function makeAddon({ name = 'my-addon', version = '1.0.0', dependencies = {}, addons = [], hasJSFiles = true } = {}, parent) {
  let addon = {
    name,
    parent,
    pkg: { name, version, dependencies, devDependencies: {} },
    _fileSystemInfo: () => ({ hasJSFiles }),
    addons: [],
  };
  addon.addons = addons.map((a) => makeAddon(a, addon));
  return addon;
}

function makeProject({ name = 'my-app', dependencies = {}, devDependencies = {}, addons = [] } = {}) {
  let project = {
    name: () => name,
    parent: null,
    pkg: { name, dependencies, devDependencies },
    addons: [],
  };
  project.addons = addons.map((a) => makeAddon(a, project));
  return project;
}

function cmp(a, b) {
  if (a == undefined || a < b) {
    return -1;
  }

  if (b == undefined || a > b) {
    return 1;
  }

  return 0;
}

function addonsInfoFor(project) {
  let addonsInfo = [...Overrides.addonsInfoFor(project)];
  addonsInfo.sort((a, b) => cmp(a.topLevel, b.topLevel) || cmp(a.parent, b.parent));
  return addonsInfo;
}

test('overrides: old babel added by app', () => {
  let project = makeProject({
    devDependencies: { 'ember-cli-babel': '^6.0.0' },
    addons: [{ name: 'ember-cli-babel', version: '6.0.0' }],
  });

  assert.deepEqual(addonsInfoFor(project), [
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

test('overrides: compatible old babel added by app', () => {
  let project = makeProject({
    devDependencies: { 'ember-cli-babel': '^7.0.0' },
    addons: [{ name: 'ember-cli-babel', version: '7.0.0' }],
  });

  assert.deepEqual(addonsInfoFor(project), [
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

test('overrides: new babel added by app is ignored', () => {
  let project = makeProject({
    devDependencies: { 'ember-cli-babel': '^7.26.6' },
    addons: [{ name: 'ember-cli-babel', version: '7.26.6' }],
  });

  assert.deepEqual(addonsInfoFor(project), []);
});

test('overrides: old babel added by direct dependency', () => {
  let project = makeProject({
    addons: [
      {
        name: 'my-addon',
        version: '1.0.0',
        addons: [{ name: 'ember-cli-babel', version: '6.0.0', dependencies: { 'ember-cli-babel': '^6.0.0' } }],
        dependencies: { 'ember-cli-babel': '^6.0.0' },
      },
    ],
  });

  assert.deepEqual(addonsInfoFor(project), [
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

test('overrides: dormant direct dependency is marked dormant', () => {
  let project = makeProject({
    addons: [
      {
        name: 'my-addon',
        version: '1.0.0',
        hasJSFiles: false,
        addons: [{ name: 'ember-cli-babel', version: '6.0.0' }],
        dependencies: { 'ember-cli-babel': '^6.0.0' },
      },
    ],
  });

  assert.deepEqual(addonsInfoFor(project), [
    {
      parent: 'my-addon@1.0.0',
      topLevel: 'my-addon',
      version: '6.0.0',
      requirement: '^6.0.0',
      compatible: false,
      dormant: true,
      path: ['my-addon@1.0.0'],
    },
  ]);
});

test('overrides: transient dependency records full path', () => {
  let project = makeProject({
    addons: [
      {
        name: 'my-addon',
        version: '1.0.0',
        addons: [
          {
            name: 'my-nested-addon',
            version: '0.1.0',
            addons: [{ name: 'ember-cli-babel', version: '6.0.0' }],
            dependencies: { 'ember-cli-babel': '^6.0.0' },
          },
        ],
      },
    ],
  });

  assert.deepEqual(addonsInfoFor(project), [
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

test('overrides: transient through dormant dependency is marked dormant', () => {
  let project = makeProject({
    addons: [
      {
        name: 'my-addon',
        version: '1.0.0',
        hasJSFiles: false,
        addons: [
          {
            name: 'my-nested-addon',
            version: '0.1.0',
            addons: [{ name: 'ember-cli-babel', version: '6.0.0' }],
            dependencies: { 'ember-cli-babel': '^6.0.0' },
          },
        ],
      },
    ],
  });

  assert.deepEqual(addonsInfoFor(project), [
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
