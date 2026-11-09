import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { set } from '@ember/object';

import Component from '@glimmer/component';

moduleFor(
  'Helpers test: {{readonly}}',
  class extends RenderingTestCase {
    '@test updating a {{readonly}} property from above works'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{@value}}'), class extends Component {})
      );

      this.render('{{foo-bar value=(readonly this.thing)}}', {
        thing: 'initial',
      });

      this.assertText('initial');

      this.assertStableRerender();

      runTask(() => set(this.context, 'thing', 'updated!'));

      this.assertText('updated!');

      runTask(() => set(this.context, 'thing', 'initial'));

      this.assertText('initial');
    }

    '@test updating a nested path of a {{readonly}}'(assert) {
      let component;

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{@value.prop}}'),
          class extends Component {
            constructor(owner, args) {
              super(owner, args);
              component = this;
            }
          }
        )
      );

      this.render('{{foo-bar value=(readonly this.thing)}}', {
        thing: {
          prop: 'initial',
        },
      });

      this.assertText('initial');

      this.assertStableRerender();

      runTask(() => set(component.args.value, 'prop', 'updated!'));

      this.assertText('updated!', 'nested path is updated');
      assert.deepEqual(this.context.thing, { prop: 'updated!' });

      runTask(() => set(component.args.value, 'prop', 'initial'));

      this.assertText('initial');
    }

    ['@test {{readonly}} of a string renders correctly']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{@value}}'), class extends Component {})
      );

      this.render('{{foo-bar value=(readonly "12")}}');

      this.assertText('12');

      this.assertStableRerender();
    }

    ['@test {{mut}} of a {{readonly}} argument is not allowed']() {
      this.owner.register(
        'component:x-bottom',
        setComponentTemplate(precompileTemplate('{{@bar}}'), class extends Component {})
      );

      this.owner.register(
        'component:x-middle',
        setComponentTemplate(
          precompileTemplate('{{@foo}} {{x-bottom bar=(mut @foo)}}'),
          class extends Component {}
        )
      );

      expectAssertion(() => {
        this.render('{{x-middle foo=(readonly this.val)}}', {
          val: 12,
        });
      }, 'You can only pass a path to mut');
    }
  }
);
