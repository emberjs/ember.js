import { moduleFor, RenderingTest } from '../../utils/test-case';
import { classes } from '../../utils/test-helpers';

class TemplateOnlyComponentsTest extends RenderingTest {
  registerComponent(name, template) {
    super.registerComponent(name, { template, ComponentClass: null });
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
      foo: 'foo', bar: 'bar'
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
      foo: 'foo', bar: 'bar'
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
      class: 'foo bar'
    });

    this.assertComponentElement(this.firstChild, {
      tagName: 'p',
      attrs: { class: classes('foo bar ember-view') },
      content: 'hello'
    });

    this.assertStableRerender();

    this.runTask(() => this.context.set('class', 'foo'));

    this.assertComponentElement(this.firstChild, {
      tagName: 'p',
      attrs: { class: classes('foo ember-view') },
      content: 'hello'
    });

    this.runTask(() => this.context.set('class', null));

    this.assertComponentElement(this.firstChild, {
      tagName: 'p',
      attrs: { class: classes('ember-view') },
      content: 'hello'
    });

    this.runTask(() => this.context.set('class', 'foo bar'));

    this.assertComponentElement(this.firstChild, {
      tagName: 'p',
      attrs: { class: classes('foo bar ember-view') },
      content: 'hello'
    });
  }
}

moduleFor('Components test: template-only components', class extends TemplateOnlyComponentsTest {});
