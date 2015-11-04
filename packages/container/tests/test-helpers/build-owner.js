import EmberObject from 'ember-runtime/system/object';
import Registry from 'container/registry';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';

export default function buildOwner(props) {
  let Owner = EmberObject.extend(RegistryProxy, ContainerProxy, {
    init() {
      this._super(...arguments);
      let registry = this.__registry__ = new Registry();
      this.__container__ = registry.container({ owner: this });
    }
  });

  return Owner.create(props);
}
