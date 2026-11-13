import {
  expectClassicComponentDeprecation,
  moduleFor,
  RenderingTestCase,
  runTask,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

import { set } from '@ember/object';
import ClassicComponent from '@ember/component';
import Component from '@glimmer/component';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

// An argument may have any name: one that starts with `Symbol` reaches the
// component as any other argument does.
moduleFor(
  'Components test: argument names',
  class extends RenderingTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} a classic component gets an argument named SymbolTable`]() {
      expectClassicComponentDeprecation();

      this.owner.register(
        'component:show-table',
        setComponentTemplate(
          precompileTemplate('{{this.SymbolTable}}|{{@SymbolTable}}'),
          ClassicComponent.extend({ tagName: '' })
        )
      );

      this.render('<ShowTable @SymbolTable={{this.table}} />', { table: 'a' });

      this.assertText('a|a');

      runTask(() => set(this.context, 'table', 'b'));

      this.assertText('b|b');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} a classic component invoked with curlies gets an argument named SymbolTable`]() {
      expectClassicComponentDeprecation();

      this.owner.register(
        'component:show-table',
        setComponentTemplate(
          precompileTemplate('{{this.SymbolTable}}'),
          ClassicComponent.extend({ tagName: '' })
        )
      );

      this.render('{{show-table SymbolTable=this.table}}', { table: 'a' });

      this.assertText('a');

      runTask(() => set(this.context, 'table', 'b'));

      this.assertText('b');
    }

    ['@test a Glimmer component gets an argument named SymbolTable']() {
      this.owner.register(
        'component:show-table',
        setComponentTemplate(
          precompileTemplate('{{this.table}}|{{@SymbolTable}}'),
          class extends Component {
            get table() {
              return this.args.SymbolTable;
            }
          }
        )
      );

      this.render('<ShowTable @SymbolTable={{this.table}} />', { table: 'a' });

      this.assertText('a|a');

      runTask(() => set(this.context, 'table', 'b'));

      this.assertText('b|b');
    }
  }
);
