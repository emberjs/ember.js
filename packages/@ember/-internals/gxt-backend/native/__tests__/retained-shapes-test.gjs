// gxt NATIVE layer: what a helper call site and an element modifier keep for
// as long as they live. Both keep their call site's argument source
// (native/args.ts `ArgsSource`). The compiler passes a fresh `{}` for a call
// site without named arguments on every evaluation; the source keeps the one
// frozen `NO_NAMED` instead, at creation and at every re-evaluation.
//
// The probes use the native manager protocols that hand the source over
// directly: an internal helper with a direct form (`valueForCallSite`, as
// `fn` has) and an internal modifier manager (`create(element, definition,
// source)`, as `on` has).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { setInternalHelperManager, setInternalModifierManager } from '@glimmer/manager';
import { run } from '@ember/runloop';
import { NO_NAMED } from '../args';
import { setupNativeRendering, textOf } from './-helpers';

const { module, test } = QUnit;

const unwrap = (value) => (typeof value === 'function' ? value() : value);

// The recorded source whose first argument is `value` (read untracked, in the test).
const sourceOf = (sources, value) => sources.find((s) => unwrap(s.positional[0]) === value);

// An internal helper whose direct form records its call site's source and
// renders its first argument, read once at creation.
function sourceRecordingHelper(sources) {
  const manager = () => {
    throw new Error('not called: the call site uses the direct form');
  };
  manager.valueForCallSite = (source) => {
    sources.push(source);
    return unwrap(source.positional[0]);
  };
  return setInternalHelperManager(manager, {});
}

// An internal modifier manager that records each modifier's source.
function sourceRecordingModifier(sources) {
  return setInternalModifierManager(
    {
      create(element, _definition, source) {
        sources.push(source);
        return { element };
      },
      install() {},
      update() {},
      getDestroyable(state) {
        return state;
      },
      getDebugName() {
        return 'source-recording';
      },
    },
    {}
  );
}

module('gxt-native | retained call-site shapes', function (hooks) {
  setupNativeRendering(hooks);

  test('a helper call site without named arguments keeps the shared frozen NO_NAMED', function (assert) {
    const sources = [];
    const probe = sourceRecordingHelper(sources);
    let root;
    class Root extends Component {
      @tracked label = 'a';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        <p id="plain">{{probe this.label}}</p>
        <p id="other">{{probe "b"}}</p>
        <p id="named">{{probe "c" tone="dark"}}</p>
      </template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'a b c');
    assert.strictEqual(sources.length, 3, 'one source per call site');
    const [plain, other, named] = ['a', 'b', 'c'].map((value) => sourceOf(sources, value));
    assert.true(Object.isFrozen(NO_NAMED), 'NO_NAMED is frozen');
    assert.deepEqual(Object.keys(NO_NAMED), [], 'NO_NAMED is empty');
    assert.strictEqual(plain.named, NO_NAMED, 'no named arguments: NO_NAMED');
    assert.strictEqual(other.named, NO_NAMED, 'another call site shares it');
    assert.notStrictEqual(named.named, NO_NAMED, 'a call site with named arguments keeps its own');
    assert.deepEqual(Object.keys(named.named), ['tone']);

    // The call site re-evaluates (its argument changed): the source is
    // updated in place and still keeps NO_NAMED.
    const positional = plain.positional;
    run(() => (root.label = 'z'));
    assert.strictEqual(sources.length, 3, 'the same helper instance');
    assert.notStrictEqual(plain.positional, positional, 'the call site re-evaluated');
    assert.strictEqual(plain.named, NO_NAMED, 'still NO_NAMED after the re-evaluation');
  });

  test('a modifier without named arguments keeps the shared frozen NO_NAMED', function (assert) {
    const sources = [];
    const probe = sourceRecordingModifier(sources);
    const Root = <template>
      <div id="plain" {{probe "a"}}></div>
      <div id="other" {{probe "b"}}></div>
      <div id="named" {{probe "c" tone="dark"}}></div>
    </template>;
    this.render(Root);
    assert.strictEqual(sources.length, 3, 'one source per modifier');
    const [plain, other, named] = ['a', 'b', 'c'].map((value) => sourceOf(sources, value));
    assert.strictEqual(plain.named, NO_NAMED, 'no named arguments: NO_NAMED');
    assert.strictEqual(other.named, NO_NAMED, 'another modifier shares it');
    assert.notStrictEqual(named.named, NO_NAMED, 'a modifier with named arguments keeps its own');
    assert.deepEqual(Object.keys(named.named), ['tone']);
  });
});
