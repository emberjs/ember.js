import { moduleFor, RenderingTest } from '../../utils/test-case';
import { set } from 'ember-metal';

moduleFor('Components test: web component fallback', class extends RenderingTest {
  ['@test custom elements are rendered']() {
    let template = `<foo-bar some-attr="123">hello</foo-bar>`;

    this.render(template);

    this.assertHTML(template);

    this.assertStableRerender();
  }

  ['@test custom elements can have bound attributes']() {
    let template = `<foo-bar some-attr="{{name}}">hello</foo-bar>`;

    this.render(template, { name: 'Robert' });

    this.assertHTML(`<foo-bar some-attr="Robert">hello</foo-bar>`);

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'name', 'Kris'));

    this.assertHTML(`<foo-bar some-attr="Kris">hello</foo-bar>`);

    this.runTask(() => set(this.context, 'name', 'Robert'));

    this.assertHTML(`<foo-bar some-attr="Robert">hello</foo-bar>`);
  }
});
