import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

// `{{~#each-in}}` (whitespace control) and `{{# each-in}}` (a space after `#`)
// are the same block as `{{#each-in}}`.
moduleFor(
  'Syntax test: {{#each-in}} with whitespace control',
  class extends RenderingTestCase {
    ['@test {{~#each-in}} lists the entries of an object']() {
      this.render('<p> {{~#each-in this.obj as |key value|}}[{{key}}={{value}}]{{/each-in}}</p>', {
        obj: { a: 1 },
      });

      this.assertHTML('<p>[a=1]</p>');
      this.assertStableRerender();

      runTask(() => set(this.context, 'obj', { a: 1, b: 2 }));
      this.assertHTML('<p>[a=1][b=2]</p>');
    }

    ['@test {{# each-in}} lists the entries of an object']() {
      this.render('<p>{{# each-in this.obj as |key value|}}[{{key}}={{value}}]{{/each-in}}</p>', {
        obj: { a: 1 },
      });

      this.assertHTML('<p>[a=1]</p>');
      this.assertStableRerender();

      runTask(() => set(this.context, 'obj', { a: 1, b: 2 }));
      this.assertHTML('<p>[a=1][b=2]</p>');
    }
  }
);
