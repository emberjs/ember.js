/**
 * Helper call sites (compat, GXT_MODE).
 *
 * Glimmer semantics: a helper's named arguments are exactly the `key=value`
 * pairs written at the call site, whatever template the call site is in (a
 * template-only component's template included).
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import templateOnly from '@ember/component/template-only';
import { capabilities as helperCapabilities, setHelperManager } from '@ember/helper';
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
