import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set, get } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

moduleFor(
  'Helpers test: {{mut}}',
  class extends RenderingTestCase {
    ['@test a simple mutable binding using `mut` propagates properly']() {
      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(
          precompileTemplate('{{@setMe}}<button {{on "click" (fn (mut @setMe) 13)}}></button>'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:middle-mut',
        setComponentTemplate(
          precompileTemplate('{{bottom-mut setMe=@value}}'),
          class extends Component {}
        )
      );

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assertText('12', 'the data propagated downwards');

      this.assertStableRerender();

      runTask(() => this.$('button').click());

      this.assertText('13', 'the set took effect');
      this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('12');
    }

    ['@test a simple mutable binding using `mut` inserts into the DOM']() {
      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(
          precompileTemplate('{{@setMe}}<button {{on "click" (fn (mut @setMe) 13)}}></button>'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:middle-mut',
        setComponentTemplate(
          precompileTemplate('[{{@value}}]{{bottom-mut setMe=(mut @value)}}'),
          class extends Component {}
        )
      );

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assertText('[12]12', 'the data propagated downwards');

      this.assertStableRerender();

      runTask(() => this.$('button').click());

      this.assertText('[13]13', 'the set took effect in the middle and the bottom');
      this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('[12]12');
    }

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

    ['@test a mutable binding with a backing getter is updated when the upstream property invalidates #11023']() {
      let middle;

      this.owner.register(
        'component:bottom-mut',
        setComponentTemplate(precompileTemplate('{{@thingy}}'), class extends Component {})
      );

      this.owner.register(
        'component:middle-mut',
        setComponentTemplate(
          precompileTemplate('{{bottom-mut thingy=(mut this.val)}}'),
          class extends Component {
            @tracked baseValue = 12;

            get val() {
              return this.baseValue;
            }

            set val(value) {
              this.baseValue = value;
            }

            constructor(owner, args) {
              super(owner, args);
              middle = this;
            }
          }
        )
      );

      this.render('{{middle-mut}}');

      this.assertText('12');

      this.assertStableRerender();

      runTask(() => (middle.baseValue = 13));

      this.assertText('13');

      runTask(() => (middle.baseValue = 12));

      this.assertText('12');
    }
  }
);
