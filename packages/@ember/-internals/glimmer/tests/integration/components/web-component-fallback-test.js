import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { set } from '@ember/-internals/metal';

moduleFor(
  'Components test: web component fallback',
  class extends RenderingTestCase {
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

      runTask(() => set(this.context, 'name', 'Kris'));

      this.assertHTML(`<foo-bar some-attr="Kris">hello</foo-bar>`);

      runTask(() => set(this.context, 'name', 'Robert'));

      this.assertHTML(`<foo-bar some-attr="Robert">hello</foo-bar>`);
    }
  }
);
