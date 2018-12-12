import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

import { template } from '@ember/-internals/glimmer';
import { precompile, compile } from 'ember-template-compiler';

import { Component } from '../utils/helpers';

moduleFor(
  'Template factory test',
  class extends RenderingTestCase {
    ['@test the template factory returned from precompile is the same as compile'](assert) {
      let { owner } = this;
      let { runtimeResolver } = this;

      let templateStr = 'Hello {{name}}';
      let options = { moduleName: 'my-app/templates/some-module.hbs' };

      let spec = precompile(templateStr, options);
      let body = `exports.default = template(${spec});`;
      let module = new Function('exports', 'template', body);
      let exports = {};
      module(exports, template);
      let Precompiled = exports['default'];

      let Compiled = compile(templateStr, options);

      assert.equal(typeof Precompiled.create, 'function', 'precompiled is a factory');
      assert.ok(Precompiled.id, 'precompiled has id');

      assert.equal(typeof Compiled.create, 'function', 'compiled is a factory');
      assert.ok(Compiled.id, 'compiled has id');

      assert.equal(runtimeResolver.templateCacheMisses, 0, 'misses 0');
      assert.equal(runtimeResolver.templateCacheHits, 0, 'hits 0');

      let precompiled = runtimeResolver.createTemplate(Precompiled, owner);

      assert.equal(runtimeResolver.templateCacheMisses, 1, 'misses 1');
      assert.equal(runtimeResolver.templateCacheHits, 0, 'hits 0');

      let compiled = runtimeResolver.createTemplate(Compiled, owner);

      assert.equal(runtimeResolver.templateCacheMisses, 2, 'misses 2');
      assert.equal(runtimeResolver.templateCacheHits, 0, 'hits 0');

      assert.ok(typeof precompiled.spec !== 'string', 'Spec has been parsed');
      assert.ok(typeof compiled.spec !== 'string', 'Spec has been parsed');

      this.registerComponent('x-precompiled', {
        ComponentClass: Component.extend({
          layout: Precompiled,
        }),
      });

      this.registerComponent('x-compiled', {
        ComponentClass: Component.extend({
          layout: Compiled,
        }),
      });

      this.render('{{x-precompiled name="precompiled"}} {{x-compiled name="compiled"}}');

      assert.equal(runtimeResolver.templateCacheMisses, 2, 'misses 2');
      assert.equal(runtimeResolver.templateCacheHits, 2, 'hits 2');

      this.assertText('Hello precompiled Hello compiled');
    }
  }
);
