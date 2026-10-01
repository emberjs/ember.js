import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import Component from '@glimmer/component';

moduleFor(
  'Helpers test: {{mut}}',
  class extends RenderingTestCase {
    ['@test passing a literal results in a assertion']() {
      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(precompileTemplate('{{@setMe}}'), class extends Component {})
      );

      expectAssertion(() => {
        this.render('{{bottom-mut setMe=(mut "foo bar")}}');
      }, 'You can only pass a path to mut');
    }

    ['@test passing the result of a helper invocation results in an assertion']() {
      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(precompileTemplate('{{@setMe}}'), class extends Component {})
      );

      expectAssertion(() => {
        this.render('{{bottom-mut setMe=(mut (concat "foo" " " "bar"))}}');
      }, 'You can only pass a path to mut');
    }

    ['@test mutable bindings work inside of yielded content']() {
      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(precompileTemplate('{{yield}}'), class extends Component {})
      );

      this.owner.register(
        'component:middle-mut',
        setComponentTemplate(
          precompileTemplate('{{#bottom-mut}}{{@model.name}}{{/bottom-mut}}'),
          class extends Component {}
        )
      );

      this.render('{{middle-mut model=(mut this.model)}}', {
        model: { name: 'Matthew Beale' },
      });

      this.assertText('Matthew Beale');

      this.assertStableRerender();

      runTask(() => set(this.context, 'model.name', 'Joel Kang'));

      this.assertText('Joel Kang');

      runTask(() => set(this.context, 'model', { name: 'Matthew Beale' }));

      this.assertText('Matthew Beale');
    }
  }
);
