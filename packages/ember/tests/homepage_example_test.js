import Route from '@ember/routing/route';
import { computed } from '@ember/object';

import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import CoreObject from '@ember/object/core';

moduleFor(
  'The example renders correctly',
  class extends ApplicationTestCase {
    async ['@test Render index template into application outlet'](assert) {
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate(
        'index',
        '<h1>People</h1><ul>{{#each @model as |person|}}<li>Hello, <b>{{person.fullName}}</b>!</li>{{/each}}</ul>'
      );

      let Person = class extends CoreObject {
        firstName = null;
        lastName = null;
        @computed('firstName', 'lastName')
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }
      };

      this.add(
        'route:index',
        class extends Route {
          model() {
            return [
              Person.create({ firstName: 'Tom', lastName: 'Dale' }),
              Person.create({ firstName: 'Yehuda', lastName: 'Katz' }),
            ];
          }
        }
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
