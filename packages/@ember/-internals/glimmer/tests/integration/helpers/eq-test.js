import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from '@ember/-internals/metal';
import { EMBER_BASIC_TEMPLATE_HELPERS } from '@ember/canary-features';

if (EMBER_BASIC_TEMPLATE_HELPERS) {
  moduleFor(
    'Helpers test: {{eq}}',
    class extends RenderingTest {
      ['@test it compares static arguments that are equal']() {
        this.render(`{{eq "foo" "foo"}}`);
        this.assertText('true');
      }

      ['@test it compares static arguments that are different']() {
        this.render(`{{eq "foo" "bar"}}`);
        this.assertText('false');
      }

      ['@test it updates for bound arguments']() {
        this.render(`{{eq first second}}`, { first: 'one', second: 'two' });

        this.assertText('false');

        this.runTask(() => this.rerender());

        this.assertText('false');

        this.runTask(() => set(this.context, 'first', 'two'));

        this.assertText('true');

        this.runTask(() => set(this.context, 'second', '2'));

        this.assertText('false');
      }

      ['@test it can be used as a sub-expression']() {
        this.render(`{{if (eq first second) "equal" "different"}}`, {
          first: 'one',
          second: 'two',
        });

        this.assertText('different');

        this.runTask(() => this.rerender());

        this.assertText('different');

        this.runTask(() => set(this.context, 'first', 'two'));

        this.assertText('equal');

        this.runTask(() => {
          set(this.context, 'first', '1');
          set(this.context, 'second', '2');
        });

        this.assertText('different');
      }
    }
  );
}
