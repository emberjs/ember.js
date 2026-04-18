import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

import { template, templateCacheCounters } from '@ember/-internals/glimmer';
import { precompile } from 'ember-template-compiler';
import { setComponentTemplate } from '@glimmer/manager';
import compile from 'internal-test-helpers/lib/compile';

import { Component } from '../utils/helpers';

moduleFor(
  'Template factory test',
  class extends RenderingTestCase {
    ['@test the template factory returned from precompile is the same as compile'](assert) {
      // snapshot counters
      this.getCacheCounters();

      let { owner } = this;

      let options = { moduleName: 'my-app/templates/some-module.hbs' };

      let spec = precompile('Hello {{this.name}}', options);
      let body = `exports.default = template(${spec});`;
      let module = new Function('exports', 'template', body);
      let exports = {};
      module(exports, template);
      let Precompiled = exports['default'];
      let Compiled = compile('Hello {{this.name}}', options);

      assert.equal(typeof Precompiled, 'function', 'precompiled is a factory');
      assert.equal(typeof Compiled, 'function', 'compiled is a factory');

      this.expectCacheChanges({}, 'no changes');

      let precompiled = Precompiled(owner);

      this.expectCacheChanges(
        {
          templateCacheMisses: 1,
        },
        'misses 1'
      );

      let compiled = Compiled(owner);

      this.expectCacheChanges(
        {
          templateCacheMisses: 1,
        },
        'misses 1'
      );

      assert.ok(typeof precompiled.spec !== 'string', 'Spec has been parsed');
      assert.ok(typeof compiled.spec !== 'string', 'Spec has been parsed');

      let XPrecompiled = class extends Component {};
      setComponentTemplate(Precompiled, XPrecompiled);
      this.owner.register('component:x-precompiled', XPrecompiled);

      let XCompiled = class extends Component {};
      setComponentTemplate(Compiled, XCompiled);
      this.owner.register('component:x-compiled', XCompiled);

      this.render('{{x-precompiled name="precompiled"}} {{x-compiled name="compiled"}}');

      this.assertText('Hello precompiled Hello compiled');
    }

    getCacheCounters() {
      return (this._counters = {
        templateCacheHits: templateCacheCounters.cacheHit,
        templateCacheMisses: templateCacheCounters.cacheMiss,
      });
    }

    expectCacheChanges(expected, message) {
      let lastState = this._counters;
      let state = this.getCacheCounters();
      let actual = diff(state, lastState);
      this.assert.deepEqual(actual, expected, message);
    }
  }
);

function diff(state, lastState) {
  let res = {};
  Object.keys(state).forEach((key) => {
    let delta = state[key] - lastState[key];
    if (delta !== 0) {
      res[key] = state[key] - lastState[key];
    }
  });
  return res;
}
