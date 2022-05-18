import Route from '@ember/routing/route';
import EmberObject, { computed } from '@ember/object';
import { A as emberA } from '@ember/array';

import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'The example renders correctly',
  class extends ApplicationTestCase {
    async ['@test Render index template into application outlet'](assert) {
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate(
        'index',
        '<h1>People</h1><ul>{{#each @model as |person|}}<li>Hello, <b>{{person.fullName}}</b>!</li>{{/each}}</ul>'
      );

      let Person = EmberObject.extend({
        firstName: null,
        lastName: null,
        fullName: computed('firstName', 'lastName', function () {
          return `${this.get('firstName')} ${this.get('lastName')}`;
        }),
      });

      this.add(
        'route:index',
        Route.extend({
          model() {
            return emberA([
              Person.create({ firstName: 'Tom', lastName: 'Dale' }),
              Person.create({ firstName: 'Yehuda', lastName: 'Katz' }),
            ]);
          },
        })
      );

      await this.visit('/');

      let $ = this.$();

      assert.equal($.findAll('h1').text(), 'People');
      assert.equal($.findAll('li').length, 2);
      assert.equal($.findAll('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
      assert.equal($.findAll('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
    }
  }
);
