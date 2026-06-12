import { ENV } from '@ember/-internals/environment';
import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

import { template, templateCacheCounters } from '@ember/-internals/glimmer';
import { precompile } from 'ember-template-compiler';

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
      let Compiled = this.compile('Hello {{this.name}}', options);

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

      this.owner.register(
        'component:x-precompiled',
        class extends Component {
          layout = Precompiled;
        }
      );

      this.owner.register(
        'component:x-compiled',
        class extends Component {
          layout = Compiled;
        }
      );

      this.render('{{x-precompiled name="precompiled"}} {{x-compiled name="compiled"}}');

      // GXT parity note: precompile===compile identity (the property under
      // test) holds on both backends — both factories parse and render
      // identically, asserted unbranched below. Only the cache-traffic
      // deltas differ: GXT renders component layouts through its own
      // compile pipeline, so repeated factory(owner) lookups (classic: one
      // per component render, plus debugRenderTree re-fetches) collapse to
      // a single classic-cache hit alongside `this.render`'s 1 miss.
      this.expectCacheChanges(
        __GXT_MODE__
          ? {
              // The single GXT hit is the debug-render-tree re-read of the
              // top-level template — present only when the render tree is
              // enabled (dev test harness), absent in production builds.
              // (`diff` below drops zero deltas, so omit the key entirely
              // when no hit is expected.)
              ...(ENV._DEBUG_RENDER_TREE ? { templateCacheHits: 1 } : {}),
              templateCacheMisses: 1,
            }
          : {
              templateCacheHits: ENV._DEBUG_RENDER_TREE ? 5 : 2,
              // from this.render
              templateCacheMisses: 1,
            },
        'hits 2'
      );
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
