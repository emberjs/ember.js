/**
 * Helper call sites (compat, GXT_MODE).
 *
 * Glimmer semantics:
 * - a helper's named arguments are exactly the `key=value` pairs written at the
 *   call site, whatever template the call site is in (a template-only
 *   component's template included);
 * - each call site of a helper gets its own helper instance per render scope
 *   (a template instance, a block instance, an `{{#each}}` row): two call
 *   sites of the same class-based helper do not share state, and tearing one
 *   down (its `{{#if}}` branch, its `{{#each}}` row) destroys only that one.
 *   That holds for a call with no positional argument (`(my-helper)`,
 *   `{{my-helper a=1}}`) too: two components, or two `{{#each}}` rows, never
 *   share its helper instance. (Two such calls of one helper in ONE render
 *   scope still share one under GXT: the compat emission does not tell those
 *   call sites apart.)
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import Helper from '@ember/component/helper';
import templateOnly from '@ember/component/template-only';
import { capabilities as helperCapabilities, setHelperManager } from '@ember/helper';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';

type UserHelper = (positional: unknown[], named: Record<string, unknown>) => unknown;

// The `[integration]` harness's helper definition (integration-tests/lib/helpers.ts).
class UserHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true });

  createHelper(definition: { helper: UserHelper }, args: any) {
    return { helper: definition.helper, args };
  }

  getValue({ helper, args }: { helper: UserHelper; args: any }) {
    return helper([...args.positional], { ...args.named });
  }
}
const USER_HELPER_MANAGER = new UserHelperManager();

function namedKeys(_positional: unknown[], named: Record<string, unknown>): string {
  return Object.keys(named).sort().join(',') || 'none';
}

moduleFor(
  'GXT helper call sites: named args',
  class extends RenderingTestCase {
    registerUserHelper(name: string, helper: UserHelper): void {
      this.owner.register(
        `helper:${name}`,
        setHelperManager(() => USER_HELPER_MANAGER, { helper }),
        { instantiate: false }
      );
    }

    ['@test a helper in a template-only component receives only the call-site named args']() {
      this.registerUserHelper('named-keys', namedKeys);
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('[{{named-keys "x"}}][{{named-keys "x" a=1}}][{{named-keys @value}}]'),
          templateOnly()
        )
      );

      this.render('<Bar @value="v" />');
      this.assertText('[none][a][none]');
    }

    ['@test a helper in a block of a template-only component receives only the call-site named args']() {
      this.registerUserHelper('named-keys', namedKeys);
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate(
            '{{#if @show}}[{{named-keys "x"}}]{{/if}}{{#each @items as |item|}}[{{named-keys item b=2}}]{{/each}}'
          ),
          templateOnly()
        )
      );

      this.render('<Bar @show={{true}} @items={{this.items}} />', { items: ['p'] });
      this.assertText('[none][b]');
    }

    ['@test a function helper in a template-only component receives no named args object']() {
      const calls: unknown[][] = [];
      this.owner.register('helper:spy', (...args: unknown[]) => {
        calls.push(args);
        return args.length;
      });
      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('[{{spy "x"}}]'), templateOnly())
      );

      this.render('<Bar @value="v" />');
      this.assertText('[1]');
    }

    ['@test a scope helper in a strict-mode template-only component receives only the call-site named args']() {
      const countArgs = (...args: unknown[]) =>
        args
          .map((arg) =>
            arg !== null && typeof arg === 'object'
              ? Object.keys(arg).sort().join('+')
              : String(arg)
          )
          .join(',');
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('[{{countArgs "x"}}][{{countArgs "x" a=1}}]', {
            strictMode: true,
            scope: () => ({ countArgs }),
          }),
          templateOnly()
        )
      );

      this.render('<Bar @value="v" />');
      this.assertText('[x][x,a]');
    }

    ['@test a helper in a Glimmer component receives only the call-site named args']() {
      this.registerUserHelper('named-keys', namedKeys);
      this.owner.register(
        'component:baz',
        setComponentTemplate(
          precompileTemplate('[{{named-keys "x"}}][{{named-keys "x" c=3}}]'),
          class extends GlimmerComponent {}
        )
      );

      this.render('<Baz @value="v" />');
      this.assertText('[none][c]');
    }
  }
);

let instances: CountingHelper[] = [];
let destroyed: string[] = [];

class CountingHelper extends Helper {
  label = '';
  computes = 0;

  override init(properties: object | undefined) {
    super.init(properties);
    instances.push(this);
  }

  compute([label]: [string]): string {
    this.label = label;
    this.computes++;
    return `${label}${this.computes}`;
  }

  override willDestroy() {
    destroyed.push(this.label);
    super.willDestroy();
  }
}

moduleFor(
  'GXT helper call sites: instances',
  class extends RenderingTestCase {
    constructor(assert: QUnit['assert']) {
      super(assert);
      instances = [];
      destroyed = [];
      this.owner.register('helper:counting', CountingHelper);
    }

    ['@test two sibling call sites of a class-based helper do not share an instance'](
      assert: QUnit['assert']
    ) {
      this.render('[{{counting "a"}}][{{counting this.b}}]', { b: 'b', other: 'x' });
      this.assertText('[a1][b1]');
      assert.strictEqual(instances.length, 2, 'one instance per call site');

      runTask(() => set(this.context, 'b', 'c'));
      // only the site whose argument changed re-computes
      this.assertText('[a1][c2]');
      assert.strictEqual(instances.length, 2, 'no new instance');
      assert.deepEqual(destroyed, [], 'nothing destroyed');
    }

    ['@test destroying one call site of a class-based helper leaves the other'](
      assert: QUnit['assert']
    ) {
      this.render('{{#if this.showA}}[{{counting "a"}}]{{/if}}[{{counting this.b}}]', {
        showA: true,
        b: 'b',
      });
      this.assertText('[a1][b1]');
      assert.strictEqual(instances.length, 2, 'one instance per call site');
      const [first, second] = instances;

      runTask(() => set(this.context, 'showA', false));
      this.assertText('[b1]');
      assert.deepEqual(destroyed, ['a'], 'only the torn-down site is destroyed');
      assert.true(first!.isDestroyed || first!.isDestroying, 'the "a" instance is destroyed');
      assert.false(second!.isDestroyed, 'the "b" instance is alive');

      runTask(() => set(this.context, 'b', 'c'));
      // the remaining site keeps its state
      this.assertText('[c2]');
      assert.false(second!.isDestroyed, 'the "b" instance is still alive');

      runTask(() => set(this.context, 'showA', true));
      // a re-rendered site gets a fresh instance
      this.assertText('[a1][c2]');
      assert.strictEqual(instances.length, 3);
    }

    ['@test the same class-based helper in {{#each}} rows gets one instance per row'](
      assert: QUnit['assert']
    ) {
      this.render('{{#each this.items as |item|}}[{{counting item}}]{{/each}}', {
        items: ['x', 'y', 'z'],
      });
      this.assertText('[x1][y1][z1]');
      assert.strictEqual(instances.length, 3, 'one instance per row');

      runTask(() => set(this.context, 'items', ['x', 'y']));
      this.assertText('[x1][y1]');
      assert.deepEqual(destroyed, ['z'], 'only the removed row is destroyed');

      runTask(() => set(this.context, 'items', ['x', 'y', 'w']));
      this.assertText('[x1][y1][w1]');
      assert.strictEqual(instances.length, 4, 'the new row gets its own instance');
      assert.deepEqual(destroyed, ['z'], 'the other rows keep their instances');
    }

    ['@test two call sites of a custom-manager helper create two helpers'](
      assert: QUnit['assert']
    ) {
      const created: unknown[] = [];
      class StatefulManager {
        capabilities = helperCapabilities('3.23', { hasValue: true });

        createHelper(_definition: object, args: any) {
          const bucket = { args, computes: 0 };
          created.push(bucket);
          return bucket;
        }

        getValue(bucket: { args: any; computes: number }) {
          bucket.computes++;
          return `${bucket.args.positional[0]}${bucket.computes}`;
        }
      }
      const definition = setHelperManager(() => new StatefulManager(), {});
      this.owner.register('helper:stateful', definition, { instantiate: false });

      this.render('[{{stateful "a"}}][{{stateful this.b}}]', { b: 'b' });
      this.assertText('[a1][b1]');
      assert.strictEqual(created.length, 2, 'one helper per call site');

      runTask(() => set(this.context, 'b', 'c'));
      this.assertText('[a1][c2]');
      assert.strictEqual(created.length, 2);
    }
  }
);

class NamedCountingHelper extends Helper {
  label = '';
  computes = 0;

  override init(properties: object | undefined) {
    super.init(properties);
    instances.push(this as unknown as CountingHelper);
  }

  compute(_positional: unknown[], { label }: { label: string }): string {
    this.label = label;
    this.computes++;
    return `${label}${this.computes}`;
  }

  override willDestroy() {
    destroyed.push(this.label);
    super.willDestroy();
  }
}

// A custom-manager helper whose value names the helper it is (1, 2, … in
// creation order) and the call's `a` argument.
function defineNumberedHelper(created: unknown[]): object {
  class NumberedManager {
    capabilities = helperCapabilities('3.23', { hasValue: true });

    createHelper(_definition: object, args: any) {
      const bucket = { args, n: created.length + 1 };
      created.push(bucket);
      return bucket;
    }

    getValue(bucket: { args: any; n: number }) {
      return `h${bucket.n}${bucket.args.named.a ?? ''}`;
    }
  }
  return setHelperManager(() => new NumberedManager(), {});
}

moduleFor(
  'GXT helper call sites: calls without a positional argument',
  class extends RenderingTestCase {
    constructor(assert: QUnit['assert']) {
      super(assert);
      instances = [];
      destroyed = [];
    }

    ['@test a zero-argument call of a custom-manager helper gets one helper per component'](
      assert: QUnit['assert']
    ) {
      const created: unknown[] = [];
      this.owner.register('helper:numbered', defineNumberedHelper(created), {
        instantiate: false,
      });
      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('{{concat "[" (numbered) "]"}}'), templateOnly())
      );

      this.render('<Bar /><Bar />');
      this.assertText('[h1][h2]');
      assert.strictEqual(created.length, 2, 'one helper per component');
    }

    ['@test a named-only call of a custom-manager helper gets one helper per component'](
      assert: QUnit['assert']
    ) {
      const created: unknown[] = [];
      this.owner.register('helper:numbered', defineNumberedHelper(created), {
        instantiate: false,
      });
      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('[{{numbered a=@a}}]'), templateOnly())
      );

      this.render('<Bar @a="x" /><Bar @a={{this.y}} />', { y: 'y' });
      this.assertText('[h1x][h2y]');
      assert.strictEqual(created.length, 2, 'one helper per component');

      runTask(() => set(this.context, 'y', 'z'));
      // each component keeps its helper
      this.assertText('[h1x][h2z]');
      assert.strictEqual(created.length, 2, 'no new helper');
    }

    ['@test a named-only call of a class-based helper gets one instance per component'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:named-counting', NamedCountingHelper);
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('[{{named-counting label=@label}}]'),
          templateOnly()
        )
      );

      this.render('<Bar @label="a" /><Bar @label={{this.b}} />', { b: 'b' });
      this.assertText('[a1][b1]');
      assert.strictEqual(instances.length, 2, 'one instance per component');

      runTask(() => set(this.context, 'b', 'c'));
      // only the component whose argument changed re-computes
      this.assertText('[a1][c2]');
      assert.strictEqual(instances.length, 2, 'no new instance');
      assert.deepEqual(destroyed, [], 'nothing destroyed');
    }

    ['@test a named-only call of a class-based helper in {{#each}} rows gets one instance per row'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:named-counting', NamedCountingHelper);

      this.render('{{#each this.items as |item|}}[{{named-counting label=item}}]{{/each}}', {
        items: ['x', 'y', 'z'],
      });
      this.assertText('[x1][y1][z1]');
      assert.strictEqual(instances.length, 3, 'one instance per row');

      runTask(() => set(this.context, 'items', ['x', 'y']));
      this.assertText('[x1][y1]');
      assert.deepEqual(destroyed, ['z'], 'only the removed row is destroyed');
    }
  }
);
