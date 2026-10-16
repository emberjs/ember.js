// gxt NATIVE layer: the runtime `template()` (@ember/template-compiler/runtime →
// native/runtime-compile.ts) — strict-mode templates compiled at runtime under
// NATIVE_FLAGS, rendered by gxt exactly like AOT `<template>`s — and that a
// runtime-compiled TEMPLATE-ONLY component is a real gxt
// render-tree node, so render contexts (the Ember owner) reach its yielded
// blocks (a manager component inside them finds its owner).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { run } from '@ember/runloop';
import Service, { service } from '@ember/service';
import { template } from '@ember/template-compiler/runtime';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | runtime template()', function (hooks) {
  setupNativeRendering(hooks);

  test('strict-mode template() with an explicit scope, class templates, yield', function (assert) {
    const shout = (s) => String(s).toUpperCase();
    const Inner = template('<i>{{shout @word}}</i>', { scope: () => ({ shout }) });
    const Outer = template('<Inner @word={{@w}} /><span>{{yield}}</span>', {
      scope: () => ({ Inner }),
    });
    let root;
    class Root extends Component {
      @tracked w = 'hey';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
    }
    template('<Outer @w={{this.w}}>ok</Outer>', { component: Root, scope: () => ({ Outer }) });
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'HEYok');
    run(() => (root.w = 'yo'));
    assert.strictEqual(textOf(this.element), 'YOok');
  });

  test('the owner reaches a yielded block of a runtime template-only component', function (assert) {
    class Greeter extends Service {
      greeting = 'hello';
    }
    this.owner.register('service:greeter', Greeter);
    class NeedsOwner extends Component {
      @service greeter;
    }
    template('<b>{{this.greeter.greeting}}</b>', { component: NeedsOwner });
    const Wrapper = template('<div class="w">{{yield}}</div>');
    const Root = template('<Wrapper><NeedsOwner /></Wrapper>', {
      scope: () => ({ Wrapper, NeedsOwner }),
    });
    this.render(Root);
    assert.strictEqual(this.element.querySelector('.w b').textContent, 'hello');
  });

  test('implicit scope through eval', function (assert) {
    const label = 'from-eval';
    const Tpl = template('<em>{{label}}</em>', {
      eval() {
        return eval(arguments[0]);
      },
    });
    this.render(Tpl);
    assert.strictEqual(textOf(this.element), label);
  });

  test('scope: () => ({ this: state }) shadows the template self', function (assert) {
    const state = { name: 'shadow' };
    const Tpl = template('<u>{{this.name}}</u>', { scope: () => ({ this: state }) });
    this.render(Tpl);
    assert.strictEqual(textOf(this.element), 'shadow');
  });

  test('a compile error throws with the template location', function (assert) {
    assert.throws(() => template('{{#if}}x'), /Template compilation failed/);
  });

  test('runtime template(): an empty <X></X> passes only its named arguments, has-block is true', function (assert) {
    const keys = [];
    class Probe extends Component {
      constructor(owner, args) {
        super(owner, args);
        keys.push(Object.keys(this.args).join(','));
      }
    }
    template('{{#if (has-block)}}B{{else}}-{{/if}}', { component: Probe });
    const Root = template(
      '<Probe @a="1"></Probe><Probe /><foo-bar></foo-bar><foo-bar data-x="1"></foo-bar>',
      { scope: () => ({ Probe }) }
    );
    this.render(Root);
    assert.deepEqual(keys, ['a', '']);
    assert.strictEqual(textOf(this.element), 'B-');
    const names = [...this.element.querySelectorAll('foo-bar')].map((el) => el.getAttributeNames());
    assert.deepEqual(names, [[], ['data-x']]);
  });
});
