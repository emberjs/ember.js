import { expectClassicComponentDeprecation, moduleFor, runTask } from 'internal-test-helpers';
import { action } from '@ember/object';
import { ClassicRenderingTestCase } from '../../../utils/classic-rendering-test-case';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Components test: <Input /> with an action from a classic root (classic component)',
    class extends ClassicRenderingTestCase {
      pressKey(key) {
        let input = this.element.querySelector('input');

        runTask(() => input.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })));
      }

      assertAction(assert, template, key) {
        assert.expect(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isEnabled ? 3 : 2);

        this.render(template, {
          foo: action(function (value, event) {
            assert.ok(true, 'action was triggered');
            assert.ok(event instanceof Event, 'Native event was passed');
          }),
        });

        this.pressKey(key);
      }

      ['@test `<Input @enter={{this.foo}} />` calls the action when <enter> is pressed'](assert) {
        expectClassicComponentDeprecation();

        this.assertAction(assert, '<Input @enter={{this.foo}} />', 'Enter');
      }

      ['@test `<Input @escape-press={{this.foo}} />` calls the action when <escape> is pressed'](
        assert
      ) {
        expectClassicComponentDeprecation();

        this.assertAction(assert, '<Input @escape-press={{this.foo}} />', 'Escape');
      }

      ['@test `{{input enter=this.foo}}` calls the action when <enter> is pressed'](assert) {
        expectClassicComponentDeprecation();

        this.assertAction(assert, '{{input enter=this.foo}}', 'Enter');
      }
    }
  );
}
