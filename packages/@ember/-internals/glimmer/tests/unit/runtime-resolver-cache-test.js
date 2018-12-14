import {
  RenderingTestCase,
  moduleFor,
  runDestroy,
  runAppend,
  runTask,
} from 'internal-test-helpers';

import { set } from '@ember/-internals/metal';

import { Component } from '../utils/helpers';

moduleFor(
  'ember-glimmer runtime resolver cache',
  class extends RenderingTestCase {
    '@test a helper definition is only generated once'(assert) {
      this.registerHelper('foo-bar', () => 'foo-bar helper!');
      this.registerHelper('baz-qux', () => 'baz-qux helper!');

      // assert precondition
      let state = this.getCacheCounters();
      assert.deepEqual(
        state,
        {
          templateCacheHits: 0,
          templateCacheMisses: 0,
          componentDefinitionCount: 0,
          helperDefinitionCount: 0,
        },
        'precondition'
      );

      this.render(
        `
          {{~#if cond~}}
            {{foo-bar}}
          {{~else~}}
            {{baz-qux}}
          {{~/if}}`,
        {
          cond: true,
        }
      );

      this.assertText('foo-bar helper!');
      state = this.expectCacheChanges(
        { helperDefinitionCount: 1 },
        state,
        'calculate foo-bar helper only'
      );

      // show component-two for the first time
      runTask(() => set(this.context, 'cond', false));

      this.assertText('baz-qux helper!');
      state = this.expectCacheChanges(
        {
          helperDefinitionCount: 1,
        },
        state,
        'calculate baz-qux helper, misses cache'
      );

      // show foo-bar again
      runTask(() => set(this.context, 'cond', true));

      this.assertText('foo-bar helper!');
      state = this.expectCacheChanges({}, state, 'toggle back to foo-bar cache hit');

      // show baz-qux again
      runTask(() => set(this.context, 'cond', false));

      this.assertText('baz-qux helper!');
      state = this.expectCacheChanges({}, state, 'toggle back to baz-qux cache hit');
    }

    '@test a component definition is only generated once'(assert) {
      // static layout
      this.registerComponent('component-one', { template: 'One' });
      this.registerComponent('component-two', {
        ComponentClass: Component.extend(),
        template: 'Two',
      });

      // assert precondition
      let state = this.getCacheCounters();
      assert.deepEqual(
        state,
        {
          templateCacheHits: 0,
          templateCacheMisses: 0,
          componentDefinitionCount: 0,
          helperDefinitionCount: 0,
        },
        'precondition'
      );

      // show component-one for the first time
      this.render(`{{component componentName}}`, {
        componentName: 'component-one',
      });

      this.assertText('One');
      state = this.expectCacheChanges(
        { componentDefinitionCount: 1 },
        state,
        'test case component and component-one no change'
      );

      // show component-two for the first time
      runTask(() => set(this.context, 'componentName', 'component-two'));

      this.assertText('Two');
      state = this.expectCacheChanges(
        { componentDefinitionCount: 1 },
        state,
        'component-two first render'
      );

      // show component-one again
      runTask(() => set(this.context, 'componentName', 'component-one'));

      this.assertText('One');
      state = this.expectCacheChanges({}, state, 'toggle back to component-one no change');

      // show component-two again
      runTask(() => set(this.context, 'componentName', 'component-two'));

      this.assertText('Two');
      state = this.expectCacheChanges({}, state, 'toggle back to component-two no change');
    }

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
      let rootFactory = this.owner.factoryFor('component:root-component');

      // assert precondition
      let state = this.getCacheCounters();
      assert.deepEqual(
        state,
        {
          templateCacheHits: 0,
          templateCacheMisses: 0,
          componentDefinitionCount: 0,
          helperDefinitionCount: 0,
        },
        'precondition'
      );

      // show component-one for the first time
      this.render(
        `
    {{~#if cond~}}
      {{component-one}}
    {{~else~}}
      {{component-two}}
    {{~/if}}`,
        {
          cond: true,
        }
      );

      this.assertText('One');
      state = this.expectCacheChanges(
        { componentDefinitionCount: 1 },
        state,
        'test case component and component-one no change'
      );

      // show component-two for the first time
      runTask(() => set(this.context, 'cond', false));

      this.assertText('Two');
      state = this.expectCacheChanges(
        {
          templateCacheMisses: 1,
          componentDefinitionCount: 1,
        },
        state,
        'component-two first render misses template cache'
      );

      // show component-one again
      runTask(() => set(this.context, 'cond', true));

      this.assertText('One');
      state = this.expectCacheChanges({}, state, 'toggle back to component-one no change');

      // show component-two again
      runTask(() => set(this.context, 'cond', false));

      this.assertText('Two');
      state = this.expectCacheChanges(
        {
          templateCacheHits: 1,
        },
        state,
        'toggle back to component-two hits template cache'
      );

      // render new root append
      let root = rootFactory.create();
      try {
        runAppend(root);
        this.assertText('TwoOne');
        // roots have different capabilities so this will hit
        state = this.expectCacheChanges({}, state, 'append root with component-one no change');

        // render new root append
        let root2 = rootFactory.create();
        try {
          runAppend(root2);
          this.assertText('TwoOneOne');
          state = this.expectCacheChanges({}, state, 'append another root no change');
        } finally {
          runDestroy(root2);
        }
      } finally {
        runDestroy(root);
      }
    }

    getCacheCounters() {
      let {
        templateCacheHits,
        templateCacheMisses,
        componentDefinitionCount,
        helperDefinitionCount,
      } = this.runtimeResolver;

      return {
        templateCacheHits,
        templateCacheMisses,
        componentDefinitionCount,
        helperDefinitionCount,
      };
    }

    expectCacheChanges(expected, lastState, message) {
      let state = this.getCacheCounters();
      let actual = diff(state, lastState);
      this.assert.deepEqual(actual, expected, message);
      return state;
    }
  }
);

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
