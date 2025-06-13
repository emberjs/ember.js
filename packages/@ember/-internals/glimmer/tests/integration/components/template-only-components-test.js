import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { templateOnlyComponent } from '@glimmer/runtime';
import { compile } from 'ember-template-compiler';
import { set } from '@ember/object';
import CoreObject from '@ember/object/core';
import { Component } from '../../utils/helpers';
import { backtrackingMessageFor } from '../../utils/debug-stack';

class TemplateOnlyComponentsTest extends RenderingTestCase {
  registerTemplateOnlyComponent(name, template) {
    super.registerComponent(name, { template, ComponentClass: null });
  }
}

moduleFor(
  'Components test: template-only components (glimmer components)',
  class extends TemplateOnlyComponentsTest {
    ['@test it can render a template-only component']() {
      this.registerTemplateOnlyComponent('foo-bar', 'hello');

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test it can render named arguments']() {
      this.registerTemplateOnlyComponent('foo-bar', '|{{@foo}}|{{@bar}}|');

      this.render('{{foo-bar foo=this.foo bar=this.bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|foo|bar|');

      this.assertStableRerender();

      runTask(() => set(this.context, 'foo', 'FOO'));

      this.assertInnerHTML('|FOO|bar|');

      runTask(() => set(this.context, 'bar', 'BAR'));

      this.assertInnerHTML('|FOO|BAR|');

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertInnerHTML('|foo|bar|');
    }

    ['@test it does not reflected arguments as properties']() {
      this.registerTemplateOnlyComponent('foo-bar', '|{{this.foo}}|{{this.bar}}|');

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|||');

      this.assertStableRerender();

      runTask(() => set(this.context, 'foo', 'FOO'));

      this.assertInnerHTML('|||');

      runTask(() => set(this.context, 'bar', null));

      this.assertInnerHTML('|||');

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertInnerHTML('|||');
    }

    ['@test it does not have curly component features']() {
      this.registerTemplateOnlyComponent('foo-bar', 'hello');

      this.render('{{foo-bar tagName="p" class=class}}', {
        class: 'foo bar',
      });

      this.assertInnerHTML('hello');

      this.assertStableRerender();

      runTask(() => set(this.context, 'class', 'foo'));

      this.assertInnerHTML('hello');

      runTask(() => set(this.context, 'class', null));

      this.assertInnerHTML('hello');

      runTask(() => set(this.context, 'class', 'foo bar'));

      this.assertInnerHTML('hello');
    }

    ['@test it has the correct bounds']() {
      this.registerTemplateOnlyComponent('foo-bar', 'hello');

      this.render('outside {{#if this.isShowing}}before {{foo-bar}} after{{/if}} outside', {
        isShowing: true,
      });

      this.assertInnerHTML('outside before hello after outside');

      this.assertStableRerender();

      runTask(() => set(this.context, 'isShowing', false));

      this.assertInnerHTML('outside <!----> outside');

      runTask(() => set(this.context, 'isShowing', null));

      this.assertInnerHTML('outside <!----> outside');

      runTask(() => set(this.context, 'isShowing', true));

      this.assertInnerHTML('outside before hello after outside');
    }

    ['@test asserts when a shared dependency is changed during rendering, and keeps original context']() {
      this.registerComponent('x-outer', {
        ComponentClass: class extends Component {
          value = 1;
          wrapper = CoreObject.create({ content: null });
        },
        template:
          '<div id="outer-value">{{x-inner-template-only value=this.wrapper.content wrapper=this.wrapper}}</div>{{x-inner value=this.value wrapper=this.wrapper}}',
      });

      this.registerComponent('x-inner', {
        ComponentClass: class extends Component {
          didReceiveAttrs() {
            set(this.wrapper, 'content', this.value);
          }
          value = null;
        },
        template: '<div id="inner-value">{{this.wrapper.content}}</div>',
      });

      this.registerTemplateOnlyComponent('x-inner-template-only', '{{@value}}');

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
      this.registerComponent('foo-bar', {
        ComponentClass: templateOnlyComponent(),
        template: 'hello',
      });

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test it can render a component when template was not registered']() {
      let ComponentClass = templateOnlyComponent();
      setComponentTemplate(compile('hello'), ComponentClass);

      this.registerComponent('foo-bar', { ComponentClass });

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@test setComponentTemplate takes precedence over registered layout']() {
      let ComponentClass = templateOnlyComponent();
      setComponentTemplate(compile('hello'), ComponentClass);

      this.registerComponent('foo-bar', {
        ComponentClass,
        resolveableTemplate: 'this should not be rendered',
      });

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
