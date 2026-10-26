import { jitSuite, RenderTest, test, tracked } from '@glimmer-workspace/integration-tests';

// More updates than a dropped guard needs to come back.
const MANY = 20;

class Item {
  @tracked text: string;

  constructor(
    public id: number,
    text: string
  ) {
    this.text = text;
  }
}

class BlockGuardsTest extends RenderTest {
  static suiteName = 'Block guards';

  @test
  'a block updates after many renders that did not change it'() {
    this.render('{{#if this.show}}<p>{{this.inner}}</p>{{/if}}<b>{{this.other}}</b>', {
      show: true,
      inner: 'a',
      other: 0,
    });
    this.assertHTML('<p>a</p><b>0</b>');

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ other: i });
      this.assertHTML(`<p>a</p><b>${i}</b>`);
    }

    this.rerender({ inner: 'b' });
    this.assertHTML(`<p>b</p><b>${MANY}</b>`);
    this.assertStableNodes();
  }

  @test
  'a block that changes on every render updates, rests, and updates again'() {
    this.render('{{#if this.show}}<p>{{this.inner}}</p>{{/if}}<b>{{this.other}}</b>', {
      show: true,
      inner: 'a',
      other: 0,
    });

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ inner: `v${i}` });
      this.assertHTML(`<p>v${i}</p><b>0</b>`);
    }

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ other: i });
      this.assertHTML(`<p>v${MANY}</p><b>${i}</b>`);
    }

    this.rerender({ inner: 'last' });
    this.assertHTML(`<p>last</p><b>${MANY}</b>`);
    this.assertStableNodes();
  }

  @test
  'a block that renders again on every update keeps the right content'() {
    this.render('{{#if this.cond}}<p>yes {{this.text}}</p>{{else}}<p>no {{this.text}}</p>{{/if}}', {
      cond: true,
      text: 'a',
    });
    this.assertHTML('<p>yes a</p>');

    for (let i = 1; i <= MANY; i++) {
      let cond = i % 2 === 0;

      this.rerender({ cond, text: `t${i}` });
      this.assertHTML(`<p>${cond ? 'yes' : 'no'} t${i}</p>`);
    }

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ text: `u${i}` });
      this.assertHTML(`<p>yes u${i}</p>`);
    }

    this.rerender({ cond: false });
    this.assertHTML(`<p>no u${MANY}</p>`);
  }

  @test
  'a nested block updates when the outer block has nothing else to do'() {
    this.render(
      '{{#if this.outer}}<div>{{#if this.inner}}<p>{{this.text}}</p>{{/if}}</div>{{/if}}<b>{{this.other}}</b>',
      { outer: true, inner: true, text: 'a', other: 0 }
    );
    this.assertHTML('<div><p>a</p></div><b>0</b>');

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ other: i });
    }

    this.rerender({ text: 'b' });
    this.assertHTML(`<div><p>b</p></div><b>${MANY}</b>`);

    for (let i = 1; i <= MANY; i++) {
      this.rerender({ text: `c${i}` });
      this.assertHTML(`<div><p>c${i}</p></div><b>${MANY}</b>`);
    }

    this.rerender({ inner: false });
    this.assertHTML(`<div><!----></div><b>${MANY}</b>`);

    this.rerender({ inner: true, text: 'd' });
    this.assertHTML(`<div><p>d</p></div><b>${MANY}</b>`);
  }

  @test
  'an item of a list updates after many renders that changed another item'() {
    let items = [new Item(1, 'a'), new Item(2, 'b'), new Item(3, 'c')];

    this.render('{{#each this.items key="id" as |item|}}<p>{{item.text}}</p>{{/each}}', { items });
    this.assertHTML('<p>a</p><p>b</p><p>c</p>');

    for (let i = 1; i <= MANY; i++) {
      items[0]!.text = `a${i}`;
      this.rerender();
      this.assertHTML(`<p>a${i}</p><p>b</p><p>c</p>`);
    }

    items[2]!.text = 'z';
    this.rerender();
    this.assertHTML(`<p>a${MANY}</p><p>b</p><p>z</p>`);
    this.assertStableNodes();
  }

  @test
  'a list updates its items after many renders with new arrays'() {
    let items = [new Item(1, 'a'), new Item(2, 'b'), new Item(3, 'c')];

    this.render('{{#each this.items key="id" as |item|}}<p>{{item.text}}</p>{{/each}}', { items });

    for (let i = 1; i <= MANY; i++) {
      items = [new Item(1, 'a'), new Item(2, `b${i}`), new Item(3, 'c')];
      this.rerender({ items });
      this.assertHTML(`<p>a</p><p>b${i}</p><p>c</p>`);
    }

    items = [new Item(3, 'c'), new Item(1, 'first'), new Item(4, 'new')];
    this.rerender({ items });
    this.assertHTML('<p>c</p><p>first</p><p>new</p>');
  }
}

jitSuite(BlockGuardsTest);
