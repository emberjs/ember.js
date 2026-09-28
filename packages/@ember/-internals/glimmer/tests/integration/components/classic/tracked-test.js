import { tracked } from '@ember/-internals/metal';
import {
  moduleFor,
  RenderingTestCase,
  runTask,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { Component as EmberComponent } from '../../../utils/helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Component Tracked Properties (classic component)',
    class extends RenderingTestCase {
      '@test simple test using classic component'() {
        expectClassicComponentDeprecation();

        let personId = 0;
        class Person {
          @tracked first;
          @tracked last;

          constructor(first, last) {
            this.id = personId++;
            this.first = first;
            this.last = last;
          }
        }

        class PersonComponent extends EmberComponent {
          @tracked first;
          @tracked last;

          get person() {
            return new Person(this.first, this.last);
          }
        }

        this.owner.register(
          'component:person-wrapper',
          setComponentTemplate(
            precompileTemplate('{{@first}} {{@last}} | {{this.person.first}} {{this.person.last}}'),
            PersonComponent
          )
        );

        this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} />', {
          first: 'robert',
          last: 'jackson',
        });

        this.assertText('robert jackson | robert jackson');

        runTask(() => this.context.set('first', 'max'));
        this.assertText('max jackson | max jackson');
      }
    }
  );
}
