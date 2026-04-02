import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { setComponentTemplate, getComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: setComponentTemplate',
  class extends RenderingTestCase {
    '@test it basically works'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test calling it with primitives asserts'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), null);
      }, /Cannot call `setComponentTemplate` on `null`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), undefined);
      }, /Cannot call `setComponentTemplate` on `undefined`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), true);
      }, /Cannot call `setComponentTemplate` on `true`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), false);
      }, /Cannot call `setComponentTemplate` on `false`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), 123);
      }, /Cannot call `setComponentTemplate` on `123`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), 'foo');
      }, /Cannot call `setComponentTemplate` on `foo`/);

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), Symbol('foo'));
      }, /Cannot call `setComponentTemplate` on `Symbol\(foo\)`/);
    }

    '@test calling it twice on the same object asserts'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let Thing = setComponentTemplate(
        precompileTemplate('hello'),
        Component.extend().reopenClass({
          toString() {
            return 'Thing';
          },
        })
      );

      assert.throws(() => {
        setComponentTemplate(precompileTemplate('foo'), Thing);
      }, /Cannot call `setComponentTemplate` multiple times on the same class \(`Class`\)/);
    }

    '@test templates set with setComponentTemplate are inherited (EmberObject.extend())'() {
      let Parent = setComponentTemplate(precompileTemplate('hello'), class extends Component {});

      this.owner.register('component:foo-bar', class extends Parent {});

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test templates set with setComponentTemplate are inherited (native ES class extends)'() {
      let Parent = setComponentTemplate(precompileTemplate('hello'), class extends Component {});

      this.owner.register('component:foo-bar', class extends Parent {});

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can re-assign templates from another class'() {
      let Foo = setComponentTemplate(precompileTemplate('shared'), class extends Component {});
      let Bar = setComponentTemplate(getComponentTemplate(Foo), class extends Component {});

      this.owner.register('component:foo', Foo);
      this.owner.register('component:bar', Bar);

      this.render('<Foo />|<Bar />');

      this.assertText('shared|shared');

      runTask(() => this.rerender());

      this.assertText('shared|shared');
    }
  }
);
