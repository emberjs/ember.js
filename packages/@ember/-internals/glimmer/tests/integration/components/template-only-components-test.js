import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { templateOnlyComponent } from '@glimmer/runtime';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';
import EmberObject from '@ember/object';
import { Component } from '../../utils/helpers';
import { backtrackingMessageFor } from '../../utils/debug-stack';

class TemplateOnlyComponentsTest extends RenderingTestCase {}

moduleFor(
  'Components test: template-only components (glimmer components)',
  class extends TemplateOnlyComponentsTest {
    ['@test it can render a template-only component']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), templateOnly())
      );

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test it can render named arguments']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('|{{@foo}}|{{@bar}}|'), templateOnly())
      );

      this.render('{{foo-bar foo=this.foo bar=this.bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|foo|bar|');

      this.assertStableRerender();

      runTask(() => this.context.set('foo', 'FOO'));

      this.assertInnerHTML('|FOO|bar|');

      runTask(() => this.context.set('bar', 'BAR'));

      this.assertInnerHTML('|FOO|BAR|');

      runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertInnerHTML('|foo|bar|');
    }

    ['@test it does not reflected arguments as properties']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('|{{this.foo}}|{{this.bar}}|'), templateOnly())
      );

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|||');

      this.assertStableRerender();

      runTask(() => this.context.set('foo', 'FOO'));

      this.assertInnerHTML('|||');

      runTask(() => this.context.set('bar', null));

      this.assertInnerHTML('|||');

      runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertInnerHTML('|||');
    }

    ['@test it does not have curly component features']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), templateOnly())
      );

      this.render('{{foo-bar tagName="p" class=class}}', {
        class: 'foo bar',
      });

      this.assertInnerHTML('hello');

      this.assertStableRerender();

      runTask(() => this.context.set('class', 'foo'));

      this.assertInnerHTML('hello');

      runTask(() => this.context.set('class', null));

      this.assertInnerHTML('hello');

      runTask(() => this.context.set('class', 'foo bar'));

      this.assertInnerHTML('hello');
    }

    ['@test it has the correct bounds']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), templateOnly())
      );

      this.render('outside {{#if this.isShowing}}before {{foo-bar}} after{{/if}} outside', {
        isShowing: true,
      });

      this.assertInnerHTML('outside before hello after outside');

      this.assertStableRerender();

      runTask(() => this.context.set('isShowing', false));

      this.assertInnerHTML('outside <!----> outside');

      runTask(() => this.context.set('isShowing', null));

      this.assertInnerHTML('outside <!----> outside');

      runTask(() => this.context.set('isShowing', true));

      this.assertInnerHTML('outside before hello after outside');
    }

    ['@test asserts when a shared dependency is changed during rendering, and keeps original context']() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate(
            '<div id="outer-value">{{x-inner-template-only value=this.wrapper.content wrapper=this.wrapper}}</div>{{x-inner value=this.value wrapper=this.wrapper}}'
          ),
          class extends Component {
            value = 1;
            wrapper = EmberObject.create({ content: null });
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div id="inner-value">{{this.wrapper.content}}</div>'),
          class extends Component {
            didReceiveAttrs() {
              this.get('wrapper').set('content', this.get('value'));
            }
            value = null;
          }
        )
      );

      this.owner.register(
        'component:x-inner-template-only',
        setComponentTemplate(precompileTemplate('{{@value}}'), templateOnly())
      );

      let expectedBacktrackingMessage = backtrackingMessageFor('content', '<.+?>', {
        renderTree: ['x-outer', 'x-inner-template-only', 'this.wrapper.content'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }
  }
);

moduleFor(
  'Components test: template-only components (using `templateOnlyComponent()`)',
  class extends RenderingTestCase {
    ['@test it can render a component']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), templateOnlyComponent())
      );

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test it can render a component when template was not registered']() {
      let ComponentClass = templateOnlyComponent();
      setComponentTemplate(precompileTemplate('hello'), ComponentClass);

      this.owner.register('component:foo-bar', ComponentClass);

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test setComponentTemplate takes precedence over registered layout']() {
      let ComponentClass = templateOnlyComponent();
      setComponentTemplate(precompileTemplate('hello'), ComponentClass);

      this.owner.register('component:foo-bar', ComponentClass);

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test templateOnly accepts a moduleName to be used for debugging / toString purposes'](
      assert
    ) {
      let ComponentClass = templateOnlyComponent('my-app/components/foo');

      assert.equal(`${ComponentClass}`, 'my-app/components/foo');
    }
  }
);
