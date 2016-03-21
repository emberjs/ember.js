import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { set } from 'ember-metal/property_set';
import Component from 'ember-views/components/component';


moduleFor('Components test: fragment components', class extends RenderingTest {
  ['@htmlbars fragments do not render an outer tag']() {
    let instance;
    let FooBarComponent = Component.extend({
      tagName: '',
      init() {
        this._super();
        instance = this;
        this.foo = true;
        this.bar = 'bar';
      }
    });

    let template = `{{#if foo}}<div>Hey</div>{{/if}}{{yield bar}}`;

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template });

    this.render(`{{#foo-bar as |bar|}}{{bar}}{{/foo-bar}}`);

    this.assertHTML(strip`<div>Hey</div>bar`);

    this.assertStableRerender();

    this.runTask(() => set(instance, 'foo', false));

    this.assertHTML(strip`<!---->bar`);

    this.runTask(() => set(instance, 'bar', 'bizz'));

    this.assertHTML(strip`<!---->bizz`);

    this.runTask(() => {
      set(instance, 'bar', 'bar');
      set(instance, 'foo', true);
    });
  }
});
