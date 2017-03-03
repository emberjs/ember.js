import { TemplateMeta } from '../../wire-format';
import { precompile } from "../";

QUnit.module('precompile');

QUnit.test('returned meta is correct', function(assert) {
  let wire = JSON.parse(precompile('Hi, {{name}}!', {
    meta: {
      "<template-meta>": true,
      moduleName: 'my/module-name',
      metaIsOpaque: 'yes'
    }
  }));

  assert.equal(wire.meta.moduleName, 'my/module-name', 'Template has correct meta');
  assert.equal(wire.meta.metaIsOpaque, 'yes', 'Template has correct meta');
});
