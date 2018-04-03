import { moduleFor, RenderingTest } from '../../utils/test-case';
import { classes } from '../../utils/test-helpers';
import { ENV } from 'ember-environment';

class TemplateOnlyComponentsTest extends RenderingTest {
  registerComponent(name, template) {
    super.registerComponent(name, { template, ComponentClass: null });
  }
}

moduleFor(
  'Components test: template-only components (glimmer components)',
  class extends TemplateOnlyComponentsTest {
    constructor() {
      super(...arguments);
      this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;
    }

    teardown() {
      super.teardown();
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
    }

    ['@test it can render a template-only component']() {
      this.registerComponent('foo-bar', 'hello');

      this.render('{{foo-bar}}');

      this.assertInnerHTML('hello');

      this.assertStableRerender();
    }

    ['@feature(ember-glimmer-named-arguments) it can render named arguments']() {
      this.registerComponent('foo-bar', '|{{@foo}}|{{@bar}}|');

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|foo|bar|');

      this.assertStableRerender();

      this.runTask(() => this.context.set('foo', 'FOO'));

      this.assertInnerHTML('|FOO|bar|');

      this.runTask(() => this.context.set('bar', 'BAR'));

      this.assertInnerHTML('|FOO|BAR|');

      this.runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertInnerHTML('|foo|bar|');
    }

    ['@test it does not reflected arguments as properties']() {
      this.registerComponent('foo-bar', '|{{foo}}|{{this.bar}}|');

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertInnerHTML('|||');

      this.assertStableRerender();

      this.runTask(() => this.context.set('foo', 'FOO'));

      this.assertInnerHTML('|||');

      this.runTask(() => this.context.set('bar', null));

      this.assertInnerHTML('|||');

      this.runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertInnerHTML('|||');
    }

    ['@test it does not have curly component features']() {
      this.registerComponent('foo-bar', 'hello');

      this.render('{{foo-bar tagName="p" class=class}}', {
        class: 'foo bar',
      });

      this.assertInnerHTML('hello');

      this.assertStableRerender();

      this.runTask(() => this.context.set('class', 'foo'));

      this.assertInnerHTML('hello');

      this.runTask(() => this.context.set('class', null));

      this.assertInnerHTML('hello');

      this.runTask(() => this.context.set('class', 'foo bar'));

      this.assertInnerHTML('hello');
    }
  }
);

moduleFor(
  'Components test: template-only components (curly components)',
  class extends TemplateOnlyComponentsTest {
    constructor() {
      super(...arguments);
      this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = false;
    }

    teardown() {
      super.teardown();
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
    }

    ['@test it can render a template-only component']() {
      this.registerComponent('foo-bar', 'hello');

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    ['@feature(ember-glimmer-named-arguments) it can render named arguments']() {
      this.registerComponent('foo-bar', '|{{@foo}}|{{@bar}}|');

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });

      this.assertStableRerender();

      this.runTask(() => this.context.set('foo', 'FOO'));

      this.assertComponentElement(this.firstChild, { content: '|FOO|bar|' });

      this.runTask(() => this.context.set('bar', 'BAR'));

      this.assertComponentElement(this.firstChild, { content: '|FOO|BAR|' });

      this.runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });
    }

    ['@test it renders named arguments as reflected properties']() {
      this.registerComponent('foo-bar', '|{{foo}}|{{this.bar}}|');

      this.render('{{foo-bar foo=foo bar=bar}}', {
        foo: 'foo',
        bar: 'bar',
      });

      this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });

      this.assertStableRerender();

      this.runTask(() => this.context.set('foo', 'FOO'));

      this.assertComponentElement(this.firstChild, { content: '|FOO|bar|' });

      this.runTask(() => this.context.set('bar', null));

      this.assertComponentElement(this.firstChild, { content: '|FOO||' });

      this.runTask(() => this.context.setProperties({ foo: 'foo', bar: 'bar' }));

      this.assertComponentElement(this.firstChild, { content: '|foo|bar|' });
    }

    ['@test it has curly component features']() {
      this.registerComponent('foo-bar', 'hello');

      this.render('{{foo-bar tagName="p" class=class}}', {
        class: 'foo bar',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'p',
        attrs: { class: classes('foo bar ember-view') },
        content: 'hello',
      });

      this.assertStableRerender();

      this.runTask(() => this.context.set('class', 'foo'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'p',
        attrs: { class: classes('foo ember-view') },
        content: 'hello',
      });

      this.runTask(() => this.context.set('class', null));

      this.assertComponentElement(this.firstChild, {
        tagName: 'p',
        attrs: { class: classes('ember-view') },
        content: 'hello',
      });

      this.runTask(() => this.context.set('class', 'foo bar'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'p',
        attrs: { class: classes('foo bar ember-view') },
        content: 'hello',
      });
    }
  }
);
