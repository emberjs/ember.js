import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-against-named-blocks',
  class extends AbstractTestCase {
    [`@feature(EMBER_NAMED_BLOCKS) is disabled when feature flag is enabled`](assert) {
      assert.expect(0);

      compile(`<Foo><:named></:named></Foo>`, {
        moduleName: 'baz/foo-bar',
      });

      compile(`{{yield to="bar"}}`, {
        moduleName: 'baz/bar-baz',
      });
    }

    [`@feature(!EMBER_NAMED_BLOCKS) is enabled when feature flag is disabled`]() {
      expectAssertion(() => {
        compile(`<Foo><:named></:named></Foo>`, {
          moduleName: 'baz/foo-bar',
        });
      }, `Named blocks are not currently available, attempted to use the <:named> named block. ('baz/foo-bar' @ L1:C5) `);

      expectAssertion(() => {
        compile(`{{yield to="bar"}}`, {
          moduleName: 'baz/bar-baz',
        });
      }, `Named blocks are not currently available, attempted to yield to a named block other than "default" or "inverse": {{yield to="bar"}}. ('baz/bar-baz' @ L1:C0) `);
    }
  }
);
