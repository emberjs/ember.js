import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { notifyPropertyChange } from '@ember/-internals/metal';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

// A list that is no Array: it iterates its items, and a change notifies `[]`
// and `length` on the list itself, as an Ember array does.
class ItemList {
  constructor(items) {
    this.items = items;
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  pushObject(item) {
    this.items.push(item);
    notifyPropertyChange(this, '[]');
    notifyPropertyChange(this, 'length');
  }
}

// `{{#each}}` re-renders when its list notifies a change, whatever path the
// list is read through: a property of a property, an argument, a property of
// a block param. The items it rendered keep their elements.
moduleFor(
  'Syntax test: {{#each}} over a list that is no Array, by the path to the list',
  class extends RenderingTestCase {
    ['@test a list in a property of a property']() {
      let list = new ItemList([{ text: 'a' }, { text: 'b' }]);

      this.render(
        '{{#each this.model.list as |item|}}<i>{{item.text}}</i>{{/each}}|{{this.model.title}}',
        { model: { list, title: 'T' } }
      );

      this.assertText('ab|T');
      let first = this.element.querySelector('i');

      runTask(() => list.pushObject({ text: 'c' }));

      this.assertText('abc|T');
      this.assert.strictEqual(this.element.querySelector('i'), first, 'a keeps its element');
    }

    ['@test a list passed as an argument']() {
      this.owner.register(
        'component:item-list',
        setComponentTemplate(
          precompileTemplate('{{#each @list as |item|}}<i>{{item.text}}</i>{{/each}}'),
          templateOnly()
        )
      );
      let list = new ItemList([{ text: 'a' }, { text: 'b' }]);

      this.render('<ItemList @list={{this.list}} />', { list });

      this.assertText('ab');
      let first = this.element.querySelector('i');

      runTask(() => list.pushObject({ text: 'c' }));

      this.assertText('abc');
      this.assert.strictEqual(this.element.querySelector('i'), first, 'a keeps its element');
    }

    ['@test a list in a property of a block param']() {
      let list = new ItemList([{ text: 'a' }, { text: 'b' }]);

      this.render(
        '{{#each this.groups as |group|}}{{#each group.list as |item|}}<i>{{item.text}}</i>{{/each}}{{/each}}',
        { groups: [{ list }] }
      );

      this.assertText('ab');
      let first = this.element.querySelector('i');

      runTask(() => list.pushObject({ text: 'c' }));

      this.assertText('abc');
      this.assert.strictEqual(this.element.querySelector('i'), first, 'a keeps its element');
    }
  }
);
