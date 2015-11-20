import { OWNER } from 'container/owner';
import Registry from 'container/registry';
import Container from 'container/container';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import EmberObject from 'ember-runtime/system/object';

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
