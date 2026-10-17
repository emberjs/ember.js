/**
 * Values a template does not read are not read (compat, GXT_MODE).
 *
 * Glimmer reads a value when the render consumes it: a property when a
 * template's path reaches it, a `(hash)` member when the hash value is read,
 * a curried argument when the component reads it, a `(fn)` callback when the
 * function is called, a getter again when a tag it consumed changed (at the
 * revalidation, not inside the `set()` that dirtied the tag). A user getter
 * that throws or has a side effect therefore runs only when the template
 * reads it.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'GXT reads: a value rendered as content',
  class extends RenderingTestCase {
    ["@test a plain object's getters do not run"](assert: QUnit['assert']) {
      let reads: string[] = [];
      let obj = {
        get boom() {
          reads.push('boom');
          return 1;
        },
      };

      this.render('{{this.obj}}|{{{this.obj}}}', { obj });
      this.assertText('[object Object]|[object Object]');
      assert.deepEqual(reads, [], 'no getter of the object ran');
    }

    ["@test an array's functions are not called"](assert: QUnit['assert']) {
      let calls: string[] = [];
      let fns = [
        function first() {
          calls.push('first');
        },
        () => {
          calls.push('arrow');
        },
      ];

      this.render('<p>{{{this.fns}}}</p>', { fns });
      assert.deepEqual(calls, [], 'no function of the array was called');
    }
  }
);
