import {
  Object as EmberObject,
  RegistryProxy,
  ContainerProxy
} from 'ember-runtime';
import { Registry } from '../../index';

export default function buildOwner(props) {
  let Owner = EmberObject.extend(RegistryProxy, ContainerProxy, {
    init() {
      this._super(...arguments);
      let registry = new Registry(this._registryOptions);
      this.__registry__ = registry;
      this.__container__ = registry.container({ owner: this });
    }
  });

  return Owner.create(props);
}
