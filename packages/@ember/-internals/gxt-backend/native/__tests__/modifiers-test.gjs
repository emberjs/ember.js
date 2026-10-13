// gxt NATIVE layer: element modifiers through the native modifier manager
// (native/modifier-manager.ts) — setModifierManager (capabilities 3.22,
// function- and class-style managers), install after insertion, update on a
// consumed-argument change only, destroy on removal, disableAutoTracking,
// non-interactive renders, curried `(modifier …)`.
//
// Every test asserts the modifier's observable side effects (DOM attributes,
// call logs) — the modifier provably RUNS.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { capabilities, setModifierManager } from '@ember/modifier';
import { renderComponent } from '@ember/renderer';
import { run } from '@ember/runloop';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

// ember-modifier style function modifier: fn(element, positional, named) → teardown
function functionModifier(fn, log) {
  class FunctionModifierManager {
    capabilities = capabilities('3.22');
    createModifier(fn) {
      log?.push('create');
      return { fn, element: null, teardown: undefined };
    }
    installModifier(state, element, args) {
      log?.push(`install connected=${element.isConnected}`);
      state.element = element;
      state.teardown = state.fn(element, [...args.positional], { ...args.named });
    }
    updateModifier(state, args) {
      log?.push('update');
      if (typeof state.teardown === 'function') state.teardown();
      state.teardown = state.fn(state.element, [...args.positional], { ...args.named });
    }
    destroyModifier(state) {
      log?.push('destroy');
      if (typeof state.teardown === 'function') state.teardown();
    }
  }
  const manager = new FunctionModifierManager();
  return setModifierManager(() => manager, fn);
}

module('gxt-native | modifiers', function (hooks) {
  setupNativeRendering(hooks);

  test('function modifier: installs after insertion, updates on arg change, destroys on removal', function (assert) {
    const log = [];
    const tagged = functionModifier((element, [label], { tone }) => {
      element.setAttribute('data-tagged', `${label}/${tone}`);
      return () => log.push(`teardown ${label}`);
    }, log);
    let root;
    class Root extends Component {
      @tracked show = true;
      @tracked label = 'a';
      @tracked unrelated = 0;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        {{#if this.show}}<div id="m" {{tagged this.label tone="warm"}}>{{this.unrelated}}</div>{{/if}}
      </template>
    }
    this.render(Root);
    const el = this.element.querySelector('#m');
    assert.strictEqual(el.getAttribute('data-tagged'), 'a/warm', 'the modifier ran');
    assert.deepEqual(log, ['create', 'install connected=true'], 'installed once, element in the document');

    run(() => root.unrelated++);
    assert.deepEqual(log.slice(2), [], 'an unrelated re-render does not update the modifier');

    run(() => (root.label = 'b'));
    assert.strictEqual(el.getAttribute('data-tagged'), 'b/warm', 'updated');
    assert.deepEqual(log.slice(2), ['update', 'teardown a'], 'one update, same element');
    assert.strictEqual(this.element.querySelector('#m'), el, 'not re-created');

    run(() => (root.show = false));
    assert.deepEqual(log.slice(4), ['destroy', 'teardown b'], 'destroyed with its element');
  });

  test('class-style manager: createModifier(definition, args) / installModifier / updateModifier only for consumed args', function (assert) {
    const calls = [];
    class Manager {
      capabilities = capabilities('3.22');
      constructor(owner) {
        this.owner = owner;
      }
      createModifier(Definition, args) {
        return new Definition(this.owner, args);
      }
      installModifier(instance, element, args) {
        instance.element = element;
        instance.didInstall(args);
      }
      updateModifier(instance, args) {
        instance.didUpdate(args);
      }
      destroyModifier(instance) {
        calls.push('destroy');
      }
    }
    class Highlight {
      constructor(owner, args) {
        this.owner = owner;
        this.args = args;
      }
      didInstall(args) {
        calls.push(`install ${args.named.color}`);
        this.element.style.color = args.named.color;
      }
      didUpdate(args) {
        calls.push(`update ${args.named.color}`);
        this.element.style.color = args.named.color;
      }
    }
    let ownerSeen;
    setModifierManager((owner) => {
      ownerSeen = owner;
      return new Manager(owner);
    }, Highlight);

    let root;
    class Root extends Component {
      @tracked color = 'red';
      @tracked ignored = 1;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><p {{Highlight color=this.color ignored=this.ignored}}>x</p></template>
    }
    this.render(Root);
    const para = this.element.querySelector('p');
    assert.strictEqual(para.style.color, 'red');
    assert.strictEqual(ownerSeen, this.owner, 'the manager factory receives the owner');
    run(() => (root.ignored = 2));
    assert.deepEqual(calls, ['install red'], 'an argument the modifier never read does not update it');
    run(() => (root.color = 'blue'));
    assert.strictEqual(para.style.color, 'blue');
    assert.deepEqual(calls, ['install red', 'update blue']);
  });

  test('a modifier reading tracked state directly updates when that state changes', function (assert) {
    class Store {
      @tracked value = 'one';
    }
    const store = new Store();
    const log = [];
    const mirror = functionModifier((element) => {
      element.setAttribute('data-value', store.value);
    }, log);
    const Root = <template><span {{mirror}}></span></template>;
    this.render(Root);
    const spanEl = this.element.querySelector('span');
    assert.strictEqual(spanEl.getAttribute('data-value'), 'one');
    run(() => (store.value = 'two'));
    assert.strictEqual(spanEl.getAttribute('data-value'), 'two');
    assert.deepEqual(log, ['create', 'install connected=true', 'update']);
  });

  test('what each install / update consumed decides the next update (nothing consumed: never updated)', function (assert) {
    class Store {
      @tracked a = 1;
      @tracked b = 1;
    }
    const store = new Store();
    const calls = [];
    const manager = (name, read) =>
      setModifierManager(
        () => ({
          capabilities: capabilities('3.22'),
          createModifier() {
            return { runs: 0 };
          },
          installModifier(state) {
            calls.push(`${name} install ${read(state.runs++)}`);
          },
          updateModifier(state) {
            calls.push(`${name} update ${read(state.runs++)}`);
          },
          destroyModifier() {},
        }),
        {}
      );
    // reads nothing: no tracking at all, never updated
    const inert = manager('inert', () => '-');
    // the install reads `a`; every update reads `a` and `b`
    const growing = manager('growing', (run) => (run === 0 ? store.a : `${store.a}/${store.b}`));
    const Root = <template><i {{inert}}></i><b {{growing}}></b></template>;
    this.render(Root);
    run(() => store.b++);
    assert.deepEqual(calls, ['inert install -', 'growing install 1'], '`b` was not read yet');
    run(() => store.a++);
    run(() => store.b++);
    assert.deepEqual(calls, [
      'inert install -',
      'growing install 1',
      'growing update 2/2',
      'growing update 2/3',
    ]);
  });

  test('disableAutoTracking: install / update run untracked (no update on change)', function (assert) {
    const calls = [];
    const def = setModifierManager(
      () => ({
        capabilities: capabilities('3.22', { disableAutoTracking: true }),
        createModifier() {
          return {};
        },
        installModifier(_s, element, args) {
          calls.push(`install ${args.positional[0]}`);
        },
        updateModifier(_s, args) {
          calls.push(`update ${args.positional[0]}`);
        },
        destroyModifier() {},
      }),
      {}
    );
    let root;
    class Root extends Component {
      @tracked v = 1;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><i {{def this.v}}></i></template>
    }
    this.render(Root);
    run(() => (root.v = 2));
    assert.deepEqual(calls, ['install 1']);
  });

  test('a modifier writing tracked state on install re-renders (no backtracking assertion)', function (assert) {
    let root;
    class Root extends Component {
      @tracked width = 0;
      measure = functionModifier((element) => {
        this.width = element.tagName.length;
      });
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><section {{this.measure}}>w={{this.width}}</section></template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'w=7');
    assert.ok(root);
  });

  test('non-interactive render: modifiers are not created at all', function (assert) {
    const log = [];
    const tagged = functionModifier((element) => element.setAttribute('data-x', '1'), log);
    const Root = <template><div {{tagged}}>static</div></template>;
    let result;
    run(() => {
      result = renderComponent(Root, {
        owner: this.owner,
        into: this.element,
        env: { isInteractive: false },
      });
    });
    assert.strictEqual(textOf(this.element), 'static');
    assert.strictEqual(this.element.querySelector('div').getAttribute('data-x'), null);
    assert.deepEqual(log, []);
    run(() => result.destroy());
  });

  test('a value without a modifier manager fails loudly (never silently inert)', function (assert) {
    const notAModifier = () => {};
    const Root = <template><div {{notAModifier}}></div></template>;
    assert.throws(() => this.render(Root), /there wasn't a modifier manager associated with the definition/);
  });

  test('curried (modifier X …): curried positional first, invocation named args override', function (assert) {
    const seen = [];
    const record = functionModifier((element, positional, named) => {
      seen.push([positional, named]);
      element.setAttribute('data-args', `${positional.join(',')}|${named.a}|${named.b}`);
    });
    let root;
    class Root extends Component {
      @tracked x = 'x1';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        {{#let (modifier record "c1" a="curried" b=this.x) as |M|}}
          <div {{M "i1" b="invocation"}}></div><span {{M}}></span>
        {{/let}}
      </template>
    }
    this.render(Root);
    assert.strictEqual(this.element.querySelector('div').getAttribute('data-args'), 'c1,i1|curried|invocation');
    assert.strictEqual(this.element.querySelector('span').getAttribute('data-args'), 'c1|curried|x1');
    run(() => (root.x = 'x2'));
    assert.strictEqual(
      this.element.querySelector('span').getAttribute('data-args'),
      'c1|curried|x2',
      'a curried argument stays reactive (update, not re-create)'
    );
  });

  test('a dynamic modifier switches with its definition (old one destroyed, new one installed)', function (assert) {
    const log = [];
    const a = functionModifier((element) => {
      element.setAttribute('data-a', '');
      return () => {
        log.push('teardown a');
        element.removeAttribute('data-a');
      };
    });
    const b = functionModifier((element) => {
      element.setAttribute('data-b', '');
      log.push('install b');
    });
    let root;
    class Root extends Component {
      @tracked useA = true;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      get mod() {
        return this.useA ? a : b;
      }
      <template><p {{this.mod}}></p></template>
    }
    this.render(Root);
    const para = this.element.querySelector('p');
    assert.true(para.hasAttribute('data-a'));
    run(() => (root.useA = false));
    assert.false(para.hasAttribute('data-a'), 'the outgoing modifier was destroyed');
    assert.true(para.hasAttribute('data-b'), 'the incoming modifier was installed');
    assert.deepEqual(log.sort(), ['install b', 'teardown a']);
  });
});
