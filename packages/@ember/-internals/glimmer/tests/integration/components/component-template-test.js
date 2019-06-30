import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import {
  EMBER_GLIMMER_SET_COMPONENT_TEMPLATE,
  EMBER_MODULE_UNIFICATION,
} from '@ember/canary-features';

import { Component, compile } from '../../utils/helpers';
import { setComponentTemplate, getComponentTemplate } from '../../..';

if (EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
  if (EMBER_MODULE_UNIFICATION) {
    moduleFor(
      'Components test: setComponentTemplate',
      class extends RenderingTestCase {
        '@skip setComponentTemplate does not work with module unification!'() {}
      }
    );
  } else {
    moduleFor(
      'Components test: setComponentTemplate',
      class extends RenderingTestCase {
        '@test it basically works'() {
          this.registerComponent('foo-bar', {
            ComponentClass: setComponentTemplate(compile('hello'), Component.extend()),
          });

          this.render('<FooBar />');

          this.assertComponentElement(this.firstChild, { content: 'hello' });

          runTask(() => this.rerender());

          this.assertComponentElement(this.firstChild, { content: 'hello' });
        }

        '@test it takes precedence over resolver'() {
          this.registerComponent('foo-bar', {
            ComponentClass: setComponentTemplate(compile('hello'), Component.extend()),
            template: 'noooooo!',
          });

          this.render('<FooBar />');

          this.assertComponentElement(this.firstChild, { content: 'hello' });

          runTask(() => this.rerender());

          this.assertComponentElement(this.firstChild, { content: 'hello' });
        }

        '@test calling it with primitives asserts'() {
          expectAssertion(() => {
            setComponentTemplate(compile('foo'), null);
          }, /Cannot call `setComponentTemplate` on `null`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), undefined);
          }, /Cannot call `setComponentTemplate` on `undefined`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), true);
          }, /Cannot call `setComponentTemplate` on `true`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), false);
          }, /Cannot call `setComponentTemplate` on `false`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), 123);
          }, /Cannot call `setComponentTemplate` on `123`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), 'foo');
          }, /Cannot call `setComponentTemplate` on `foo`/);

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), Symbol('foo'));
          }, /Cannot call `setComponentTemplate` on `Symbol\(foo\)`/);
        }

        '@test calling it twice on the same object asserts'() {
          let Thing = setComponentTemplate(
            compile('hello'),
            Component.extend().reopenClass({
              toString() {
                return 'Thing';
              },
            })
          );

          expectAssertion(() => {
            setComponentTemplate(compile('foo'), Thing);
          }, /Cannot call `setComponentTemplate` multiple times on the same class \(`Thing`\)/);
        }

        '@test templates set with setComponentTemplate are inherited (EmberObject.extend())'() {
          let Parent = setComponentTemplate(compile('hello'), Component.extend());

          this.registerComponent('foo-bar', {
            ComponentClass: Parent.extend(),
          });

          this.render('<FooBar />');

          this.assertComponentElement(this.firstChild, { content: 'hello' });

          runTask(() => this.rerender());

          this.assertComponentElement(this.firstChild, { content: 'hello' });
        }

        '@test templates set with setComponentTemplate are inherited (native ES class extends)'() {
          let Parent = setComponentTemplate(compile('hello'), Component.extend());

          this.registerComponent('foo-bar', {
            ComponentClass: class extends Parent {},
          });

          this.render('<FooBar />');

          this.assertComponentElement(this.firstChild, { content: 'hello' });

          runTask(() => this.rerender());

          this.assertComponentElement(this.firstChild, { content: 'hello' });
        }

        '@test it can re-assign templates from another class'() {
          let Foo = setComponentTemplate(compile('shared'), Component.extend());
          let Bar = setComponentTemplate(getComponentTemplate(Foo), Component.extend());

          this.registerComponent('foo', { ComponentClass: Foo });
          this.registerComponent('bar', { ComponentClass: Bar });

          this.render('<Foo />|<Bar />');

          this.assertText('shared|shared');

          runTask(() => this.rerender());

          this.assertText('shared|shared');
        }
      }
    );
  }
}
