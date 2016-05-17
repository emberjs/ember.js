import Ember from 'ember-templates';
import require from 'require';

QUnit.module('ember-templates reexports');

[
  ['_Renderer',     'ember-templates/renderer',              'Renderer'],
  ['Component',     'ember-templates/component',             'default'],
  ['Helper',        'ember-templates/helper',                'default'],
  ['Helper.helper', 'ember-templates/helper',                'helper'],
  ['Checkbox',      'ember-templates/components/checkbox',   'default'],
  ['LinkComponent', 'ember-templates/components/link-to',    'default'],
  ['TextArea',      'ember-templates/components/text_area',  'default'],
  ['TextField',     'ember-templates/components/text_field', 'default'],
  ['TEMPLATES',     'ember-templates/template_registry',     { get: 'getTemplates', set: 'setTemplates' }]
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;
  QUnit.test(`Ember.${path} exports correctly`, assert => {
    let desc = getDescriptor(Ember, path);
    let mod = require(moduleId);
    if (typeof exportName === 'string') {
      assert.equal(desc.value, mod[exportName], `Ember.${path} is exported correctly`);
    } else {
      assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
      assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
    }
  });
});

function getDescriptor(obj, path) {
  let parts = path.split('.');
  let value = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i];
    value = value[part];
    if (!value) {
      return undefined;
    }
  }
  let last = parts[parts.length - 1];
  return Object.getOwnPropertyDescriptor(value, last);
}

// TODO: This test should go somewhere else
QUnit.test('`LinkComponent#currentWhen` is deprecated in favour of `current-when` (DEPRECATED)', function() {
  expectDeprecation(/Usage of `currentWhen` is deprecated, use `current-when` instead/);
  let link = Ember.LinkComponent.create();
  link.get('currentWhen');
});
