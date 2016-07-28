import Ember from 'ember-templates';
import isEnabled from 'ember-metal/features';
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
  ['TEMPLATES',     'ember-templates/template_registry',     { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.template', 'ember-templates/template', 'default'],
  ['Handlebars.SafeString', 'ember-templates/string', { get: 'getSafeString' }],
  ['Handlebars.Utils.escapeExpression', 'ember-templates/string', 'escapeExpression'],
  ['String.htmlSafe', 'ember-templates/string', 'htmlSafe'],
  ['HTMLBars.makeBoundHelper', 'ember-templates/make-bound-helper', 'default']
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;
  QUnit.test(`Ember.${path} exports correctly`, assert => {
    confirmExport(assert, path, moduleId, exportName);
  });
});

if (isEnabled('ember-string-ishtmlsafe')) {
  QUnit.test('Ember.String.isHTMLSafe exports correctly', function(assert) {
    confirmExport(assert, 'String.isHTMLSafe', 'ember-templates/string', 'isHTMLSafe');
  });
}

function confirmExport(assert, path, moduleId, exportName) {
  let desc = getDescriptor(Ember, path);
  let mod = require(moduleId);
  if (typeof exportName === 'string') {
    assert.equal(desc.value, mod[exportName], `Ember.${path} is exported correctly`);
  } else {
    assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
    assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
  }
}

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
