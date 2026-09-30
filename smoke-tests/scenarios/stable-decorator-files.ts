// App and test files shared by the smoke-test scenarios that run an app under
// standard (stage 3) decorators, whichever compiler implements them.
export const stableDecoratorFiles = {
  app: {
    services: {
      'my-example.js': `
        import Service from '@ember/service';
        export default class MyExample extends Service {
          message = 'Message from MyExample';

          constructor(...args) {
            super(...args);
            if (globalThis.myExampleTracker) {
              globalThis.myExampleTracker.initialized = true;
            }
          }
        }
      `
    }
  },
  tests: {
    unit: {
      'tracked-accessor-test.gjs': `
        import { module, test } from 'qunit';
        import { setupRenderingTest } from 'ember-qunit';
        import { render, click } from '@ember/test-helpers';
        import { on } from '@ember/modifier';
        import { tracked } from '@glimmer/tracking';
        import Component from '@glimmer/component';

        module('Unit | tracked-accessor', function(hooks) {
          setupRenderingTest(hooks);

          test('interactive update', async function(assert) {
            class Example extends Component {
              @tracked accessor count = 0;
              inc = () => { this.count++ };

              <template>
                <div class="example">
                  <span>{{this.count}}</span>
                  <button {{on "click" this.inc}}>+</button>
                </div>

              </template>
            }

            await render(<template><Example /></template>);
            assert.dom('.example span').hasText('0');
            await click('.example button');
            assert.dom('.example span').hasText('1');
          });
        });
      `,
      'tracked-object-tag-test.js': `
        import { module, test } from 'qunit';
        import { tracked } from '@glimmer/tracking';
        import { tagForObject } from '@ember/-internals/metal';
        import { valueForTag, validateTag } from '@glimmer/validator';

        // {{#each-in}} and ObjectProxy depend on the object's own tag, which
        // every form of @tracked must dirty when it is set.
        module('Unit | tracked object tag', function() {
          test('setting a tracked field dirties the object tag', function(assert) {
            class Example {
              @tracked count = 0;
            }
            let obj = new Example();
            let tag = tagForObject(obj);
            let snapshot = valueForTag(tag);
            obj.count = 1;
            assert.false(validateTag(tag, snapshot));
          });

          test('setting a tracked accessor dirties the object tag', function(assert) {
            class Example {
              @tracked accessor count = 0;
            }
            let obj = new Example();
            let tag = tagForObject(obj);
            let snapshot = valueForTag(tag);
            obj.count = 1;
            assert.false(validateTag(tag, snapshot));
          });
        });
      `,
      'service-accessor-test.gjs': `
        import { module, test } from 'qunit';
        import { setupRenderingTest } from 'ember-qunit';
        import { render, click } from '@ember/test-helpers';
        import { on } from '@ember/modifier';
        import { tracked } from '@glimmer/tracking';
        import Service, { service } from '@ember/service';
        import Component from '@glimmer/component';

        module('Unit | service-accessor', function(hooks) {
          setupRenderingTest(hooks);

          test('service is available', async function(assert) {
            class Example extends Component {
              @service accessor myExample;

              <template>
                <div class="example">{{this.myExample.message}}</div>
              </template>
            }

            await render(<template><Example /></template>);
            assert.dom('.example').hasText('Message from MyExample');
          });

          test('service is lazy', async function(assert) {
            class InitTracker {
              @tracked accessor initialized = false;
            }
            globalThis.myExampleTracker = new InitTracker();
            class Example extends Component {
              @service accessor myExample;
              @tracked accessor reveal = false;

              revealIt = () => { this.reveal = true }

              <template>
                <div class="example">
                  {{#if this.reveal}}
                    {{this.myExample.message}}
                  {{/if}}
                  <span>
                    {{#if globalThis.myExampleTracker.initialized}}
                      Service Initialized
                    {{else}}
                      Service Not Initialized
                    {{/if}}
                  </span>
                  <button {{on "click" this.revealIt}}>Reveal</button>
                </div>
              </template>
            }

            await render(<template><Example /></template>);
            assert.dom('.example span').hasText('Service Not Initialized')
            await click('.example button');
            assert.dom('.example span').hasText('Service Initialized')
          });

          test('service can be replaced by assignment', async function(assert) {
            class ReplacementTest extends Service {
              @service accessor myExample;
            }
            this.owner.register('service:replacement-test', ReplacementTest);
            let r = this.owner.lookup('service:replacement-test');
            assert.strictEqual(r.myExample.message, 'Message from MyExample');
            r.myExample = { message: 'overridden' };
            assert.strictEqual(r.myExample.message, 'overridden');
          });
        });
      `
    },
  },
};
