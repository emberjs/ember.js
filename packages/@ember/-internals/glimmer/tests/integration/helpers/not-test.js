import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from '@ember/-internals/metal';
import { EMBER_BASIC_TEMPLATE_HELPERS } from '@ember/canary-features';

if (EMBER_BASIC_TEMPLATE_HELPERS) {
  moduleFor(
    'Helpers test: {{not}}',
    class extends RenderingTest {
      ['@test returns true for falsy static arguments']() {
        this.render(`{{not false}}`);
        this.assertText('true');
      }

      ['@test returns false for truthy static arguments']() {
        this.render(`{{not 42}}`);
        this.assertText('false');
      }

      ['@test it updates for bound arguments']() {
        this.render(`{{not argument}}`, { argument: 0 });

        this.assertText('true');

        this.runTask(() => this.rerender());

        this.assertText('true');

        this.runTask(() => set(this.context, 'argument', 1));

        this.assertText('false');

        this.runTask(() => set(this.context, 'argument', false));

        this.assertText('true');

        this.runTask(() => set(this.context, 'argument', 'false'));

        this.assertText('false');

        this.runTask(() => set(this.context, 'argument', true));

        this.assertText('false');
      }

      ['@test it can be used as a sub-expression']() {
        this.render(`{{if (not disabled) "enabled" "disabled"}}`, { disabled: false });

        this.assertText('enabled');

        this.runTask(() => this.rerender());

        this.assertText('enabled');

        this.runTask(() => set(this.context, 'disabled', true));

        this.assertText('disabled');
      }
    }
  );
}
