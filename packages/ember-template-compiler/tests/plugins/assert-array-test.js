import { defineComponent, moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-array-test',
  class extends RenderingTestCase {
    ['@test block param `array` is not transformed']() {
      // Intentionally double all of the values to verify that this
      // version of the `array` function is used.
      function customArray(...values) {
        return values.map((value) => value * 2);
      }

      let Root = defineComponent(
        { customArray },
        `{{#let customArray as |array|}}<ul>{{#each (array 1 2 3) as |item|}}<li>{{item}}</li>{{/each}}</ul>{{/let}}`
      );
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML('<ul><li>2</li><li>4</li><li>6</li></ul>');
      this.assertStableRerender();
    }

    ['@test lexical scope `array` is not transformed']() {
      // Intentionally double all of the values to verify that this
      // version of the `array` function is used.
      function array(...values) {
        return values.map((value) => value * 2);
      }

      let Root = defineComponent(
        { array },
        `<ul>{{#each (array 1 2 3) as |item|}}<li>{{item}}</li>{{/each}}</ul>`
      );
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML('<ul><li>2</li><li>4</li><li>6</li></ul>');
      this.assertStableRerender();
    }

    ['@test survives undefined item with key']() {
      let myArray = [1, undefined];

      let Root = defineComponent(
        { myArray },
        `<ul>{{#each myArray key="anything" as |item|}}<li>{{item}}</li>{{/each}}</ul>`
      );
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML('<ul><li>1</li><li></li></ul>');
      this.assertStableRerender();
    }

    ['@test survives null item with key']() {
      let myArray = [1, null];

      let Root = defineComponent(
        { myArray },
        `<ul>{{#each myArray key="anything" as |item|}}<li>{{item}}</li>{{/each}}</ul>`
      );
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML('<ul><li>1</li><li></li></ul>');
      this.assertStableRerender();
    }
  }
);
