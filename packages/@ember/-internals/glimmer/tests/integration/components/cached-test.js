import { cached, tracked } from '@ember/-internals/metal';
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { Component } from '../../utils/helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  'Component Standalone Cached Values',
  class extends RenderingTestCase {
    '@test standalone cached values rerender when their inputs update'() {
      class CountComponent extends Component {
        count = tracked(0);
        doubled = cached(() => this.count.value * 2);

        increment = () => {
          this.count.value++;
        };
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.increment}}>{{this.doubled.value}}</button>'
          ),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('2');
    }

    '@test standalone cached values in module scope rerender when their inputs update'(assert) {
      let count = tracked(0);
      let computations = 0;
      let doubled = cached(() => {
        computations++;
        return count.value * 2;
      });

      class CountComponent extends Component {
        doubled = doubled;
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('{{this.doubled.value}} and {{this.doubled.value}}'),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0 and 0');
      assert.strictEqual(computations, 1, 'computed once for two reads');

      runTask(() => count.set(1));

      this.assertText('2 and 2');
      assert.strictEqual(computations, 2, 'computed once after the input changed');
    }
  }
);
