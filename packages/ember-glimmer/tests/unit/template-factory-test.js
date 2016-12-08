import { precompile, compile } from 'ember-template-compiler';
import { template } from '../../index';
import { RenderingTest, moduleFor } from '../utils/test-case';
import { Component } from '../utils/helpers';

moduleFor('Template factory test', class extends RenderingTest {
  ['@test the template factory returned from precompile is the same as compile'](assert) {
    let { env } = this;

    let templateStr = 'Hello {{name}}';
    let options = { moduleName: 'some-module' };

    let spec = precompile(templateStr, options);
    let body = `exports.default = template(${spec});`;
    let module = new Function('exports', 'template', body);
    let exports = { };
    module(exports, template);
    let Precompiled = exports['default'];

    let Compiled = compile(templateStr, options);

    assert.equal(typeof Precompiled.create, 'function', 'precompiled is a factory');
    assert.ok(Precompiled.id, 'precompiled has id');

    assert.equal(typeof Compiled.create, 'function', 'compiled is a factory');
    assert.ok(Compiled.id, 'compiled has id');

    assert.equal(env._templateCache.misses, 0, 'misses 0');
    assert.equal(env._templateCache.hits, 0, 'hits 0');

    let precompiled = env.getTemplate(Precompiled, env.owner);

    assert.equal(env._templateCache.misses, 1, 'misses 1');
    assert.equal(env._templateCache.hits, 0, 'hits 0');

    let compiled = env.getTemplate(Compiled, env.owner);

    assert.equal(env._templateCache.misses, 2, 'misses 2');
    assert.equal(env._templateCache.hits, 0, 'hits 0');

    assert.ok(typeof precompiled.spec !== 'string', 'Spec has been parsed');
    assert.ok(typeof compiled.spec !== 'string', 'Spec has been parsed');

    this.registerComponent('x-precompiled', {
      ComponentClass: Component.extend({
        layout: Precompiled
      })
    });

    this.registerComponent('x-compiled', {
      ComponentClass: Component.extend({
        layout: Compiled
      })
    });

    this.render('{{x-precompiled name="precompiled"}} {{x-compiled name="compiled"}}');

    assert.equal(env._templateCache.misses, 2, 'misses 2');
    assert.equal(env._templateCache.hits, 2, 'hits 2');

    this.assertText('Hello precompiled Hello compiled');
  }
});
