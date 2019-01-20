import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class EachSuite extends RenderTest {
  static suiteName = '#each';

  @test
  'basic #each'() {
    let list = [1, 2, 3, 4];
    this.render('{{#each list key="@index" as |item|}}{{item}}{{else}}Empty{{/each}}', {
      list,
    });
    this.assertHTML('1234');
    this.assertStableRerender();

    list.push(5, 6);
    this.rerender({ list });
    this.assertHTML('123456');
    this.assertStableNodes();

    list = [];
    this.rerender({ list });
    this.assertHTML('Empty');
    this.assertStableNodes();

    list = [1, 2, 3, 4];
    this.rerender({ list });
    this.assertHTML('1234');
    this.assertStableNodes();
  }

  @test
  'keyed #each'() {
    let list = [{ text: 'hello' }];
    this.render('{{#each list key="text" as |item|}}{{item.text}}{{else}}Empty{{/each}}', {
      list,
    });
    this.assertHTML('hello');
    this.assertStableRerender();

    list.push({ text: ' ' });
    list.push({ text: 'World' });
    this.rerender({ list });
    this.assertHTML('hello World');
    this.assertStableNodes();

    list = [];
    this.rerender({ list });
    this.assertHTML('Empty');
    this.assertStableNodes();

    list = [{ text: 'hello' }];
    this.rerender({ list });
    this.assertHTML('hello');
    this.assertStableNodes();
  }

  @test
  'receives the index as the second parameter'() {
    let list = [1, 2, 3, 4];
    this.render('{{#each list key="@index" as |item i|}}{{item}}-{{i}}:{{else}}Empty{{/each}}', {
      list,
    });
    this.assertHTML('1-0:2-1:3-2:4-3:');
    this.assertStableRerender();

    list.push(5, 6);
    this.rerender({ list });
    this.assertHTML('1-0:2-1:3-2:4-3:5-4:6-5:');
    this.assertStableNodes();

    list = [];
    this.rerender({ list });
    this.assertHTML('Empty');
    this.assertStableNodes();

    list = [1, 2, 3, 4];
    this.rerender({ list });
    this.assertHTML('1-0:2-1:3-2:4-3:');
    this.assertStableNodes();
  }

  @test
  'receives the index as the second parameter (when key=@identity)'() {
    let v1 = val(1);
    let v2 = val(2);
    let v3 = val(3);
    let v4 = val(4);
    let v5 = val(5);
    let v6 = val(6);

    let list = [v1, v2, v3, v4];
    this.render(
      '{{#each list key="@identity" as |item i|}}{{item.val}}-{{i}}{{else}}Empty{{/each}}',
      {
        list,
      }
    );
    this.assertHTML('1-02-13-24-3');
    this.assertStableRerender();

    list.push(v5, v6);
    this.rerender({ list });
    this.assertHTML('1-02-13-24-35-46-5');
    this.assertStableNodes();

    v1.val = 1000;
    this.rerender({ list });
    this.assertHTML('1000-02-13-24-35-46-5');
    this.assertStableNodes();

    list = [];
    this.rerender({ list });
    this.assertHTML('Empty');
    this.assertStableNodes();

    list = [val(1), val(2), val(3), val(4)];
    this.rerender({ list });
    this.assertHTML('1-02-13-24-3');
    this.assertStableNodes();
  }

  @test
  'it can render duplicate primitive items'() {
    let list = ['a', 'a', 'a'];
    this.render('{{#each list key="@index" as |item|}}{{item}}{{/each}}', {
      list,
    });
    this.assertHTML('aaa');
    this.assertStableRerender();

    list.push('a', 'a');
    this.rerender({ list });
    this.assertHTML('aaaaa');
    this.assertStableNodes();

    list = ['a', 'a', 'a'];
    this.rerender({ list });
    this.assertHTML('aaa');
    this.assertStableNodes();
  }

  @test
  'it can render duplicate objects'() {
    let dup = { text: 'dup' };
    let list = [dup, dup, { text: 'uniq' }];
    this.render('{{#each list key="@index" as |item|}}{{item.text}}{{/each}}', {
      list,
    });
    this.assertHTML('dupdupuniq');
    this.assertStableRerender();

    list.push(dup);
    this.rerender({ list });
    this.assertHTML('dupdupuniqdup');
    this.assertStableNodes();

    list = [dup, dup, { text: 'uniq' }];
    this.rerender({ list });
    this.assertHTML('dupdupuniq');
    this.assertStableNodes();
  }

  @test
  'it renders all items with duplicate key values'() {
    let list = [{ text: 'Hello' }, { text: 'Hello' }, { text: 'Hello' }];

    this.render(`{{#each list key="@identity" as |item|}}{{item.text}}{{/each}}`, {
      list,
    });

    this.assertHTML('HelloHelloHello');
    this.assertStableRerender();

    list.forEach(item => (item.text = 'Goodbye'));

    this.rerender({ list });
    this.assertHTML('GoodbyeGoodbyeGoodbye');
    this.assertStableNodes();

    list = [{ text: 'Hello' }, { text: 'Hello' }, { text: 'Hello' }];

    this.rerender({ list });
    this.assertHTML('HelloHelloHello');
    this.assertStableNodes();
  }

  @test
  'scoped variable not available outside list'() {
    let list = ['Wycats'];

    this.render(`{{name}}-{{#each list key="@index" as |name|}}{{name}}{{/each}}-{{name}}`, {
      list,
      name: 'Stef',
    });

    this.assertHTML('Stef-Wycats-Stef');
    this.assertStableRerender();

    list.push(' ', 'Chad');
    this.rerender({ list });
    this.assertHTML('Stef-Wycats Chad-Stef');
    this.assertStableNodes();

    this.rerender({ name: 'Tom' });
    this.assertHTML('Tom-Wycats Chad-Tom');
    this.assertStableNodes();

    list = ['Wycats'];

    this.rerender({ list, name: 'Stef' });
    this.assertHTML('Stef-Wycats-Stef');
    this.assertStableNodes();
  }

  @test
  'else template is displayed with context'() {
    let list: string[] = [];

    this.render(
      `{{#each list key="@index" as |name|}}Has thing{{else}}No thing {{otherThing}}{{/each}}`,
      {
        list,
        otherThing: 'Chad',
      }
    );

    this.assertHTML('No thing Chad');
    this.assertStableRerender();

    this.rerender({ otherThing: 'Bill' });
    this.assertHTML('No thing Bill');
    this.assertStableNodes();

    list.push('thing');
    this.rerender({ list });
    this.assertHTML('Has thing');
    this.assertStableNodes();

    this.rerender({ otherThing: 'Chad', list: [] });
    this.assertHTML('No thing Chad');
    this.assertStableNodes();
  }
}

function val(i: number): { val: number } {
  return { val: i };
}
