import { OWNER } from 'ember-utils';
import { Container, Registry } from 'container';
import ContainerProxy from '../../mixins/container_proxy';
import EmberObject from '../../system/object';

QUnit.module('ember-runtime/mixins/container_proxy', {
  setup() {
    this.Owner = EmberObject.extend(ContainerProxy);
    this.instance = this.Owner.create();

    let registry = new Registry();

    this.instance.__container__ = new Container(registry, {
      owner: this.instance
    });
  }
});

QUnit.test('provides ownerInjection helper method', function(assert) {
  let result = this.instance.ownerInjection();

  assert.equal(result[OWNER], this.instance, 'returns an object with the OWNER symbol');
});
