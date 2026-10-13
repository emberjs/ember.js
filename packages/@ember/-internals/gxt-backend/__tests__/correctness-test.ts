/**
 * Regression tests for compat-layer fixes where gxt-backend diverged from
 * classic Ember. The test page loads this file only in GXT builds
 * (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, ApplicationTestCase } from 'internal-test-helpers';
import ObjectProxy from '@ember/object/proxy';
import Route from '@ember/routing/route';
import { precompileTemplate } from '@ember/template-compilation';
import { VERSION } from '@ember/version';
import * as templateCompiler from 'ember-template-compiler';
import { CustomComponentManager, componentCapabilities } from '../manager';
import { destroy } from '../destroyable';
import { getGxtRenderer } from '../gxt-bridge';
import { createCache, getValue, isConst } from '@glimmer/tracking/primitives/cache';

declare const QUnit: any;

QUnit.module('GXT correctness: CustomComponentManager', function () {
  function managerFor(delegate: object) {
    const manager = new CustomComponentManager(() => delegate);
    const state = manager.create({}, {}, { named: {}, positional: [] });
    return { manager, state };
  }

  QUnit.test(
    'didCreate / didUpdate call the delegate when it has asyncLifecycleCallbacks',
    function (assert: any) {
      const calls: string[] = [];
      const { manager, state } = managerFor({
        capabilities: componentCapabilities('3.13', {
          asyncLifecycleCallbacks: true,
          updateHook: true,
        }),
        createComponent: () => ({}),
        updateComponent() {},
        didCreateComponent: () => calls.push('didCreateComponent'),
        didUpdateComponent: () => calls.push('didUpdateComponent'),
      });

      manager.didCreate(state);
      manager.didUpdate(state);

      assert.deepEqual(calls, ['didCreateComponent', 'didUpdateComponent']);
    }
  );

  QUnit.test(
    'destroying the destroyable runs the delegate destroyComponent',
    function (assert: any) {
      const calls: string[] = [];
      const { manager, state } = managerFor({
        capabilities: componentCapabilities('3.13', { destructor: true }),
        createComponent: () => ({}),
        destroyComponent: () => calls.push('destroyComponent'),
      });

      const destroyable = manager.getDestroyable(state);
      assert.strictEqual(destroyable, state, 'the bucket is the destroyable');
      destroy(destroyable);

      assert.deepEqual(calls, ['destroyComponent']);
    }
  );
});

QUnit.module('GXT correctness: ember-template-compiler shim', function () {
  QUnit.test('exports the public underscore-prefixed names', function (assert: any) {
    assert.strictEqual(typeof (templateCompiler as any)._buildCompileOptions, 'function');
    assert.strictEqual(typeof (templateCompiler as any)._transformsFor, 'function');
  });

  QUnit.test('VERSION is the Ember version', function (assert: any) {
    assert.strictEqual((templateCompiler as any).VERSION, VERSION);
  });

  QUnit.test('compile runs the AST plugins of plugins.ast', function (assert: any) {
    const removeDataTest = () => ({
      name: 'remove-data-test',
      visitor: {
        ElementNode(node: { attributes: Array<{ name: string }> }) {
          node.attributes = node.attributes.filter((attr) => attr.name !== 'data-test');
        },
      },
    });
    const factory = (templateCompiler as any).compile('<p data-test="x" class="y">z</p>', {
      plugins: { ast: [removeDataTest] },
    });
    const element = document.createElement('div');
    factory().render({}, element);
    assert.strictEqual(element.innerHTML, '<p class="y">z</p>');
  });
});

QUnit.module('GXT correctness: @glimmer/tracking/primitives/cache', function () {
  QUnit.test('isConst is the validator one (as upstream re-exports it)', function (assert: any) {
    const constCache = createCache(() => 123);
    assert.throws(
      () => isConst(constCache),
      /isConst\(\) can only be used on a cache once getValue\(\) has been called at least once/
    );
    getValue(constCache);
    assert.true(isConst(constCache), 'a cache that consumed no tags is constant');
  });
});

QUnit.module('GXT correctness: compile pipeline throwOnCompileError', function () {
  function compile(source: string, options: object) {
    return getGxtRenderer()!.compilePipeline.compileTemplate!(source, options);
  }

  QUnit.test('throws a parse error', function (assert: any) {
    assert.throws(() => compile('<div>{{#if this.x}}</div>', { throwOnCompileError: true }));
  });

  QUnit.test('throws the error of an AST plugin', function (assert: any) {
    const failingPlugin = () => ({
      name: 'failing-plugin',
      visitor: {
        ElementNode() {
          throw new Error('plugin failed');
        },
      },
    });
    assert.throws(
      () => compile('<p></p>', { plugins: { ast: [failingPlugin] }, throwOnCompileError: true }),
      /plugin failed/
    );
  });
});

moduleFor(
  'GXT correctness: {{#if}} truthiness',
  class extends RenderingTestCase {
    ['@test a plain object with a `content` key is truthy']() {
      this.render('{{#if this.obj}}yes{{else}}no{{/if}}', { obj: { content: '' } });
      this.assertText('yes');
    }

    ['@test an object that implements unknownProperty is truthy']() {
      this.render('{{#if this.obj}}yes{{else}}no{{/if}}', {
        obj: { unknownProperty() {}, setUnknownProperty() {} },
      });
      this.assertText('yes');
    }

    ['@test an ObjectProxy is truthy only when its content is']() {
      this.render('{{#if this.empty}}yes{{else}}no{{/if}}|{{#if this.full}}yes{{else}}no{{/if}}', {
        empty: ObjectProxy.create({ content: null }),
        full: ObjectProxy.create({ content: {} }),
      });
      this.assertText('no|yes');
    }
  }
);

moduleFor(
  'GXT correctness: route models',
  class extends ApplicationTestCase {
    async ['@test rendering a route does not serialize its model'](assert: any) {
      let serialized = 0;
      const model = {
        name: 'Tomster',
        toJSON() {
          serialized++;
          return {};
        },
      };
      this.add(
        'route:application',
        class extends Route {
          model() {
            return model;
          }
        }
      );
      this.add('template:application', precompileTemplate('{{@model.name}}'));

      await this.visit('/');

      this.assertText('Tomster');
      assert.strictEqual(serialized, 0, 'the model was never passed to JSON.stringify');
    }
  }
);
