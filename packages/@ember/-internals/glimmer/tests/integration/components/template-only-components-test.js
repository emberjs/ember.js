import { moduleFor, RenderingTestCase, classes, runTask } from 'internal-test-helpers';
import { EMBER_GLIMMER_SET_COMPONENT_TEMPLATE } from '@ember/canary-features';

import { ENV } from '@ember/-internals/environment';
import { setComponentTemplate } from '@ember/-internals/glimmer';
import templateOnly from '@ember/component/template-only';
import { compile } from 'ember-template-compiler';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { Component } from '../../utils/helpers';
import { backtrackingMessageFor } from '../../utils/backtracking-rerender';

class TemplateOnlyComponentsTest extends RenderingTestCase {
  registerTemplateOnlyComponent(name, template) {
    super.registerComponent(name, { template, ComponentClass: null });
  }
}

if (ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
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

        this.render('{{foo-bar foo=foo bar=bar}}', {
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
        this.registerTemplateOnlyComponent('foo-bar', '|{{foo}}|{{this.bar}}|');

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
        this.registerTemplateOnlyComponent('foo-bar', 'hello');

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
        this.registerTemplateOnlyComponent('foo-bar', 'hello');

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
        this.registerComponent('x-outer', {
          ComponentClass: Component.extend({
            value: 1,
            wrapper: EmberObject.create({ content: null }),
          }),
          template:
            '<div id="outer-value">{{x-inner-template-only value=this.wrapper.content wrapper=wrapper}}</div>{{x-inner value=value wrapper=wrapper}}',
        });

        this.registerComponent('x-inner', {
          ComponentClass: Component.extend({
            didReceiveAttrs() {
              this.get('wrapper').set('content', this.get('value'));
            },
            value: null,
          }),
          template: '<div id="inner-value">{{wrapper.content}}</div>',
        });

        this.registerTemplateOnlyComponent('x-inner-template-only', '{{@value}}');

        let expectedBacktrackingMessage = backtrackingMessageFor('content', '<.+?>', {
          renderTree: ['x-outer', 'this.wrapper.content'],
        });

        expectAssertion(() => {
          this.render('{{x-outer}}');
        }, expectedBacktrackingMessage);
      }
    }
  );
} else {
  moduleFor(
    'Components test: template-only components (curly components)',
    class extends TemplateOnlyComponentsTest {
      ['@test it can render a template-only component']() {
        this.registerTemplateOnlyComponent('foo-bar', 'hello');

        this.render('{{foo-bar}}');

        this.assertComponentElement(this.firstChild, { content: 'hello' });

        this.assertStableRerender();
      }

      ['@test it can render named arguments']() {
        this.registerTemplateOnlyComponent('foo-bar', '|{{@foo}}|{{@bar}}|');

        this.render('{{foo-bar foo=foo bar=bar}}', {
          foo: 'foo',
          bar: 'bar',
        });

        this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });

        this.assertStableRerender();

        runTask(() => this.context.set('foo', 'FOO'));

        this.assertComponentElement(this.firstChild, { content: '|FOO|bar|' });

        runTask(() => this.context.set('bar', 'BAR'));

        this.assertComponentElement(this.firstChild, { content: '|FOO|BAR|' });

        runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

        this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });
      }

      ['@test it renders named arguments as reflected properties']() {
        this.registerTemplateOnlyComponent('foo-bar', '|{{foo}}|{{this.bar}}|');

        this.render('{{foo-bar foo=foo bar=bar}}', {
          foo: 'foo',
          bar: 'bar',
        });

        this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });

        this.assertStableRerender();

        runTask(() => this.context.set('foo', 'FOO'));

        this.assertComponentElement(this.firstChild, { content: '|FOO|bar|' });

        runTask(() => this.context.set('bar', null));

        this.assertComponentElement(this.firstChild, { content: '|FOO||' });

        runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

        this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });
      }

      ['@test it has curly component features']() {
        this.registerTemplateOnlyComponent('foo-bar', 'hello');

        this.render('{{foo-bar tagName="p" class=class}}', {
          class: 'foo bar',
        });

        this.assertComponentElement(this.firstChild, {
          tagName: 'p',
          attrs: { class: classes('foo bar ember-view') },
          content: 'hello',
        });

        this.assertStableRerender();

        runTask(() => this.context.set('class', 'foo'));

        this.assertComponentElement(this.firstChild, {
          tagName: 'p',
          attrs: { class: classes('foo ember-view') },
          content: 'hello',
        });

        runTask(() => this.context.set('class', null));

        this.assertComponentElement(this.firstChild, {
          tagName: 'p',
          attrs: { class: classes('ember-view') },
          content: 'hello',
        });

        runTask(() => this.context.set('class', 'foo bar'));

        this.assertComponentElement(this.firstChild, {
          tagName: 'p',
          attrs: { class: classes('foo bar ember-view') },
          content: 'hello',
        });
      }
    }
  );
}

if (EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
  moduleFor(
    'Components test: template-only components (using `templateOnlyComponent()`)',
    class extends RenderingTestCase {
      ['@test it can render a component']() {
        this.registerComponent('foo-bar', { ComponentClass: templateOnly(), template: 'hello' });

        this.render('{{foo-bar}}');

        this.assertInnerHTML('hello');

        this.assertStableRerender();
      }

      ['@test it can render a component when template was not registered']() {
        let ComponentClass = templateOnly();
        setComponentTemplate(compile('hello'), ComponentClass);

        this.registerComponent('foo-bar', { ComponentClass });

        this.render('{{foo-bar}}');

        this.assertInnerHTML('hello');

        this.assertStableRerender();
      }

      ['@test setComponentTemplate takes precedence over registered layout']() {
        let ComponentClass = templateOnly();
        setComponentTemplate(compile('hello'), ComponentClass);

        this.registerComponent('foo-bar', {
          ComponentClass,
          template: 'this should not be rendered',
        });

        this.render('{{foo-bar}}');

        this.assertInnerHTML('hello');

        this.assertStableRerender();
      }

      ['@test templateOnly accepts a moduleName to be used for debugging / toString purposes'](
        assert
      ) {
        let ComponentClass = templateOnly('my-app/components/foo');

        assert.equal(`${ComponentClass}`, 'my-app/components/foo');
      }
    }
  );
}
