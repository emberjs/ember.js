import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

moduleFor(
  'ember-template-compiler: assert-array-test',
  class extends RenderingTestCase {
    ['@test block param `array` is not transformed']() {
      // Intentionally double all of the values to verify that this
      // version of the `array` function is used.
      function customArray(...values) {
        return values.map((value) => value * 2);
      }

      let Root = setComponentTemplate(
        precompileTemplate(
          `{{#let customArray as |array|}}<ul>{{#each (array 1 2 3) as |item|}}<li>{{item}}</li>{{/each}}</ul>{{/let}}`,
          { strictMode: true, scope: () => ({ customArray }) }
        ),
        templateOnly()
      );
      this.owner.register('component:root', Root);

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

      let Root = setComponentTemplate(
        precompileTemplate(`<ul>{{#each (array 1 2 3) as |item|}}<li>{{item}}</li>{{/each}}</ul>`, {
          strictMode: true,
          scope: () => ({ array }),
        }),
        templateOnly()
      );
      this.owner.register('component:root', Root);

      this.render('<Root />');
      this.assertHTML('<ul><li>2</li><li>4</li><li>6</li></ul>');
      this.assertStableRerender();
    }

    ['@test survives undefined item with key']() {
      let myArray = [1, undefined];

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ul>{{#each myArray key="anything" as |item|}}<li>{{item}}</li>{{/each}}</ul>`,
          { strictMode: true, scope: () => ({ myArray }) }
        ),
        templateOnly()
      );
      this.owner.register('component:root', Root);

      this.render('<Root />');
      this.assertHTML('<ul><li>1</li><li></li></ul>');
      this.assertStableRerender();
    }

    ['@test survives null item with key']() {
      let myArray = [1, null];

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ul>{{#each myArray key="anything" as |item|}}<li>{{item}}</li>{{/each}}</ul>`,
          { strictMode: true, scope: () => ({ myArray }) }
        ),
        templateOnly()
      );
      this.owner.register('component:root', Root);

      this.render('<Root />');
      this.assertHTML('<ul><li>1</li><li></li></ul>');
      this.assertStableRerender();
    }
  }
);
