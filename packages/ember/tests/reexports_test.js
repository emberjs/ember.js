import Ember from 'ember';
import isEnabled from 'ember-metal/features';
import require from 'require';

QUnit.module('ember reexports');

[
  ['_Renderer',     'ember-glimmer', '_Renderer'],
  ['Component',     'ember-glimmer', 'Component'],
  ['Helper',        'ember-glimmer', 'Helper'],
  ['Helper.helper', 'ember-glimmer', 'helper'],
  ['Checkbox',      'ember-glimmer', 'Checkbox'],
  ['LinkComponent', 'ember-glimmer', 'LinkComponent'],
  ['TextArea',      'ember-glimmer', 'TextArea'],
  ['TextField',     'ember-glimmer', 'TextField'],
  ['TEMPLATES',     'ember-glimmer', { get: 'getTemplates', set: 'setTemplates' }],
  ['Handlebars.template', 'ember-glimmer', 'template'],
  ['Handlebars.SafeString', 'ember-glimmer', { get: '_getSafeString' }],
  ['Handlebars.Utils.escapeExpression', 'ember-glimmer', 'escapeExpression'],
  ['String.htmlSafe', 'ember-glimmer', 'htmlSafe'],
  ['HTMLBars.makeBoundHelper', 'ember-glimmer', 'makeBoundHelper'],
  ['String', 'ember-runtime', 'String']
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;
  QUnit.test(`Ember.${path} exports correctly`, assert => {
    confirmExport(assert, path, moduleId, exportName);
  });
});

if (isEnabled('ember-string-ishtmlsafe')) {
  QUnit.test('Ember.String.isHTMLSafe exports correctly', function(assert) {
    confirmExport(assert, 'String.isHTMLSafe', 'ember-glimmer', 'isHTMLSafe');
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
