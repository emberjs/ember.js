// gxt NATIVE layer: Ember/Glimmer attribute write semantics through gxt's
// `normalizeAttrValue` host hook (native/host-hooks.ts) — initial writes AND
// reactive re-applies.
import { trackedObject } from '@ember/reactive/collections';
import { htmlSafe } from '@ember/template';
import { run } from '@ember/runloop';
import { setupNativeRendering } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | attributes', function (hooks) {
  setupNativeRendering(hooks);

  test('false / undefined / null remove the attribute; true writes it bare', function (assert) {
    const args = trackedObject({ v: 'x' });
    const Root = <template><div id="t" data-v={{@v}}></div></template>;
    this.render(Root, args);
    const el = () => this.element.querySelector('#t');
    assert.strictEqual(el().getAttribute('data-v'), 'x');
    run(() => (args.v = false));
    assert.false(el().hasAttribute('data-v'), 'false removes');
    run(() => (args.v = true));
    assert.strictEqual(el().getAttribute('data-v'), '', 'true writes an empty value');
    run(() => (args.v = null));
    assert.false(el().hasAttribute('data-v'), 'null removes');
    run(() => (args.v = 'back'));
    assert.strictEqual(el().getAttribute('data-v'), 'back');
    run(() => (args.v = undefined));
    assert.false(el().hasAttribute('data-v'), 'undefined removes');
  });

  test('values are stringified (numbers, symbols); no-toString objects remove', function (assert) {
    const args = trackedObject({ v: 1 });
    const Root = <template><div id="t" data-v={{@v}}></div></template>;
    this.render(Root, args);
    const el = () => this.element.querySelector('#t');
    assert.strictEqual(el().getAttribute('data-v'), '1');
    run(() => (args.v = Symbol('debug')));
    assert.strictEqual(el().getAttribute('data-v'), 'Symbol(debug)');
    run(() => (args.v = Object.create(null)));
    assert.false(el().hasAttribute('data-v'));
  });

  test('URL attributes are sanitized (javascript:/vbscript:); safe URLs pass', function (assert) {
    const args = trackedObject({ url: 'javascript:alert(1)' });
    const Root = <template><a id="a" href={{@url}}>x</a><img id="i" src={{@url}} /></template>;
    this.render(Root, args);
    assert.strictEqual(this.element.querySelector('#a').getAttribute('href'), 'unsafe:javascript:alert(1)');
    assert.strictEqual(this.element.querySelector('#i').getAttribute('src'), 'unsafe:javascript:alert(1)');
    run(() => (args.url = 'https://emberjs.com/'));
    assert.strictEqual(this.element.querySelector('#a').getAttribute('href'), 'https://emberjs.com/');
    run(() => (args.url = 'VBScript:x'));
    assert.strictEqual(this.element.querySelector('#a').getAttribute('href'), 'unsafe:VBScript:x');
    run(() => (args.url = '/relative/path'));
    assert.strictEqual(this.element.querySelector('#a').getAttribute('href'), '/relative/path');
  });

  test('...attributes precedence: attributes after it win, before it lose; classes in source order', function (assert) {
    const Before = <template><div class="own" data-x="own" title="own" ...attributes></div></template>;
    const After = <template><div ...attributes class="own" data-x="own" title={{@title}}></div></template>;
    const args = trackedObject({ title: 'local' });
    const Root = <template>
      <Before id="b" class="fw" data-x="fw" />
      <After id="a" class="fw" data-x="fw" title="fw" @title={{@title}} />
    </template>;
    this.render(Root, args);
    const before = this.element.querySelector('#b');
    const after = this.element.querySelector('#a');
    assert.strictEqual(before.getAttribute('data-x'), 'fw', 'forwarded wins over an attribute before it');
    assert.strictEqual(before.getAttribute('title'), 'own', 'a non-forwarded attribute stays');
    assert.strictEqual(before.className, 'own fw', 'own class first');
    assert.strictEqual(after.getAttribute('data-x'), 'own', 'an attribute after ...attributes wins');
    assert.strictEqual(after.getAttribute('title'), 'local');
    assert.strictEqual(after.className, 'fw own', 'forwarded class first');
    assert.false(after.hasOwnProperty('__splatLocal__'), 'the precedence marker is not applied');
    run(() => (args.title = 'changed'));
    assert.strictEqual(after.getAttribute('title'), 'changed', 'the winning local binding stays reactive');
  });

  // Glimmer's class attribute: one value is a plain dynamic attribute
  // (normalizeValue); several (own + forwarded by `...attributes`) merge like
  // createClassListRef — non-empty strings joined by a space, no attribute when
  // all are empty. Port of the classic `Dynamic content tests (integration) ::
  // quoteless class attributes update correctly` (content-test.js), which the
  // native suite does not load.
  test('quoteless class={{if …}}: a falsy condition removes the attribute (no inverse is undefined)', function (assert) {
    const args = trackedObject({ on: true });
    const Root = <template><div id="t" class={{if @on "foo-bar"}}>hello</div></template>;
    this.render(Root, args);
    const el = () => this.element.querySelector('#t');
    assert.strictEqual(el().getAttribute('class'), 'foo-bar');
    run(() => (args.on = false));
    assert.false(el().hasAttribute('class'), 'falsy: no class attribute (not class="")');
    run(() => (args.on = true));
    assert.strictEqual(el().getAttribute('class'), 'foo-bar');
  });

  test('class: false / undefined / null remove it, "" keeps class="", true is ""', function (assert) {
    const args = trackedObject({ v: 'x' });
    const Root = <template><div id="t" class={{@v}}></div></template>;
    this.render(Root, args);
    const el = () => this.element.querySelector('#t');
    for (const [value, expected] of [
      [false, null],
      ['', ''],
      [undefined, null],
      ['y', 'y'],
      [null, null],
      [true, ''],
    ]) {
      run(() => (args.v = value));
      assert.strictEqual(el().getAttribute('class'), expected, `class={{${String(value)}}}`);
    }
  });

  test('class: a falsy `if` / truthy `unless` without an inverse writes nothing', function (assert) {
    const args = trackedObject({ on: false });
    const Root = <template>
      <p id="s" class={{if false "x"}}></p>
      <p id="u" class={{unless true "x"}}></p>
      <p id="d" class={{unless @on "x"}} title={{if @on "t"}}></p>
    </template>;
    this.render(Root, args);
    assert.false(this.element.querySelector('#s').hasAttribute('class'), 'constant `if`');
    assert.false(this.element.querySelector('#u').hasAttribute('class'), 'constant `unless`');
    const d = this.element.querySelector('#d');
    assert.strictEqual(d.getAttribute('class'), 'x');
    assert.false(d.hasAttribute('title'), 'any attribute: `if` without an inverse is undefined');
    run(() => (args.on = true));
    assert.false(d.hasAttribute('class'));
    assert.strictEqual(d.getAttribute('title'), 't');
  });

  test('class in a whitespace-free {{#each}} row (the static-block row path)', function (assert) {
    const args = trackedObject({ items: [{ c: 'a' }, { c: undefined }, { c: '' }] });
    const Root = <template><ul>{{#each @items as |i|}}<li class={{i.c}}>x</li>{{/each}}</ul></template>;
    this.render(Root, args);
    const lis = Array.from(this.element.querySelectorAll('li'));
    assert.deepEqual(
      lis.map((li) => li.getAttribute('class')),
      ['a', null, ''],
      'undefined writes no class; "" keeps class=""'
    );
  });

  test('class merged with ...attributes: empty values are skipped; all empty removes it', function (assert) {
    const args = trackedObject({ own: 'own', fw: 'fw' });
    const Inner = <template><div id="t" class={{@own}} ...attributes></div></template>;
    const Root = <template><Inner class={{@fw}} @own={{@own}} /></template>;
    this.render(Root, args);
    const el = () => this.element.querySelector('#t');
    assert.strictEqual(el().getAttribute('class'), 'own fw');
    run(() => (args.fw = undefined));
    assert.strictEqual(el().getAttribute('class'), 'own', 'no trailing space');
    run(() => (args.own = ''));
    assert.false(el().hasAttribute('class'), 'every value empty: no attribute');
    run(() => (args.fw = false));
    assert.strictEqual(el().getAttribute('class'), 'false', 'Glimmer stringifies false in a class list');
    run(() => {
      args.own = 'a';
      args.fw = 'b';
    });
    assert.strictEqual(el().getAttribute('class'), 'a b');
  });

  test('SafeString attribute values write their HTML string', function (assert) {
    const Root = <template><div id="t" title={{@title}}></div></template>;
    this.render(Root, { title: htmlSafe('<b>t</b>') });
    assert.strictEqual(this.element.querySelector('#t').getAttribute('title'), '<b>t</b>');
  });
});
