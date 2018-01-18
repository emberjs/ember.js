import { RenderingTest, moduleFor } from '../utils/test-case';
import { Component } from '../utils/helpers';
import { set } from 'ember-metal';
import { runDestroy, runAppend } from 'internal-test-helpers';

moduleFor('Layout cache test', class extends RenderingTest {

  ['@test each template is only compiled once'](assert) {
    // static layout
    this.registerComponent('component-one', { template: 'One' });

    // test directly import template factory onto late bound layout
    let Two = Component.extend({
      layout: this.compile('Two'),
    });
    this.registerComponent('component-two', { ComponentClass: Two });

    // inject layout onto component, share layout with component-one
    this.registerComponent('root-component', { ComponentClass: Component });
    this.owner.inject('component:root-component', 'layout', 'template:components/component-one');

    // template instance shared between to template managers
    // Root components doesn't have creation arguments
    let rootFactory = this.owner.factoryFor('component:root-component');

    // assert precondition
    let state = this.getCacheCounters();
    assert.deepEqual(state, {
      wrapperCacheHits: 0,
      wrapperCacheMisses: 0,
      templateCacheHits: 0,
      templateCacheMisses: 0,
    }, 'precondition');

    // show component-one for the first time
    this.render(`
    {{~#if cond~}}
      {{component-one}}
    {{~else~}}
      {{component-two}}
    {{~/if}}`, {
      cond: true,
    });

    this.assertText('One');
    state = this.expectCacheChanges({
      wrapperCacheMisses: 2,
    }, state, 'test case component and component-one miss wrapper cache');

    // show component-two for the first time
    this.runTask(() => set(this.context, 'cond', false));

    this.assertText('Two');
    state = this.expectCacheChanges({
      templateCacheMisses: 1,
      wrapperCacheMisses: 1,
    }, state, 'component-two first render misses both template cache and wrapper cache');

    // show component-one again
    this.runTask(() => set(this.context, 'cond', true));

    this.assertText('One');
    state = this.expectCacheChanges({
      wrapperCacheHits: 1,
    }, state, 'toggle back to component-one hits wrapper cache');

    // show component-two again
    this.runTask(() => set(this.context, 'cond', false));

    this.assertText('Two');
    state = this.expectCacheChanges({
      wrapperCacheHits: 1,
      templateCacheHits: 1,
    }, state, 'toggle back to component-two hits wrapper cache and template cache');

    // render new root append
    let root = rootFactory.create();
    try {
      runAppend(root);
      this.assertText('TwoOne');
      // roots have different capabilities so this will hit
      state = this.expectCacheChanges({
        wrapperCacheMisses: 1,
      }, state, 'append root with component-one template misses because different capabilities');

      // render new root append
      let root2 = rootFactory.create();
      try {
        runAppend(root2);
        this.assertText('TwoOneOne');
        state = this.expectCacheChanges({
          wrapperCacheHits: 1,
        }, state, 'append another root hits');
      } finally {
        runDestroy(root2);
      }
    } finally {
      runDestroy(root);
    }
  }

  getCacheCounters() {
    let { runtimeResolver: {
      wrapperCacheHits,
      wrapperCacheMisses,
      templateCacheHits,
      templateCacheMisses,
    } } = this;
    return {
      wrapperCacheHits,
      wrapperCacheMisses,
      templateCacheHits,
      templateCacheMisses,
    };
  }

  expectCacheChanges(expected, lastState, message) {
    let state = this.getCacheCounters();
    let actual = diff(state, lastState);
    this.assert.deepEqual(actual, expected, message);
    return state;
  }
});

function diff(state, lastState) {
  let res = {};
  Object.keys(state).forEach(key => {
    let delta = state[key] - lastState[key];
    if (delta !== 0) {
      res[key] = state[key] - lastState[key];
    }
  });
  return res;
}
