import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import Component from '@glimmer/component';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  'EventDispatcher',
  class extends RenderingTestCase {
    ['@test case insensitive events'](assert) {
      let receivedEvent;

      this.owner.register(
        'component:x-bar',
        setComponentTemplate(
          precompileTemplate(`<button id="is-done" onclick={{this.clicked}}>my button</button>`),
          class extends Component {
            clicked(event) {
              receivedEvent = event;
            }
          }
        )
      );

      this.render(`{{x-bar}}`);

      runTask(() => this.$('#is-done').trigger('click'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }

    ['@test case sensitive events'](assert) {
      let receivedEvent;

      this.owner.register(
        'component:x-bar',
        setComponentTemplate(
          precompileTemplate(`<button id="is-done" onClick={{this.clicked}}>my button</button>`),
          class extends Component {
            clicked(event) {
              receivedEvent = event;
            }
          }
        )
      );

      this.render(`{{x-bar}}`);

      runTask(() => this.$('#is-done').trigger('click'));
      assert.ok(receivedEvent, 'change event was triggered');
      assert.strictEqual(receivedEvent.target, this.$('#is-done')[0]);
    }
  }
);

moduleFor(
  'EventDispatcher#setup',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);

      this.dispatcher = this.owner.lookup('event_dispatcher:main');
    }

    getBootOptions() {
      return {
        skipEventDispatcher: true,
      };
    }

    ['@test a rootElement can be specified'](assert) {
      this.element.innerHTML = '<div id="app"></div>';
      // this.$().append('<div id="app"></div>');
      this.dispatcher.setup({ myevent: 'myEvent' }, '#app');

      assert.ok(this.$('#app').hasClass('ember-application'), 'custom rootElement was used');
      assert.equal(this.dispatcher.rootElement, '#app', 'the dispatchers rootElement was updated');
    }

    ['@test throws if specified rootElement does not exist'](assert) {
      assert.throws(() => {
        this.dispatcher.setup({ myevent: 'myEvent' }, '#app');
      });
    }
  }
);
