import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { HAS_NATIVE_SYMBOL } from '@ember/-internals/utils';

import { Component, compile } from '../../utils/helpers';
import { setComponentTemplate, getComponentTemplate } from '../../..';

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

    '@test calling it with primitives asserts'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        setComponentTemplate(compile('foo'), null);
      }, /Cannot call `setComponentTemplate` on `null`/);

      assert.throws(() => {
        setComponentTemplate(compile('foo'), undefined);
      }, /Cannot call `setComponentTemplate` on `undefined`/);

      assert.throws(() => {
        setComponentTemplate(compile('foo'), true);
      }, /Cannot call `setComponentTemplate` on `true`/);

      assert.throws(() => {
        setComponentTemplate(compile('foo'), false);
      }, /Cannot call `setComponentTemplate` on `false`/);

      assert.throws(() => {
        setComponentTemplate(compile('foo'), 123);
      }, /Cannot call `setComponentTemplate` on `123`/);

      assert.throws(() => {
        setComponentTemplate(compile('foo'), 'foo');
      }, /Cannot call `setComponentTemplate` on `foo`/);

      if (HAS_NATIVE_SYMBOL) {
        assert.throws(() => {
          setComponentTemplate(compile('foo'), Symbol('foo'));
        }, /Cannot call `setComponentTemplate` on `Symbol\(foo\)`/);
      }
    }

    '@test calling it twice on the same object asserts'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let Thing = setComponentTemplate(
        compile('hello'),
        Component.extend().reopenClass({
          toString() {
            return 'Thing';
          },
        })
      );

      assert.throws(() => {
        setComponentTemplate(compile('foo'), Thing);
      }, /Cannot call `setComponentTemplate` multiple times on the same class \(`Class`\)/);
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
