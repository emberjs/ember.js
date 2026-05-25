export { default as RegistryProxyMixin } from './lib/mixins/registry_proxy';
export { default as ContainerProxyMixin } from './lib/mixins/container_proxy';
export { default as ActionHandler } from './lib/mixins/action_handler';
export { contentFor as _contentFor } from './lib/proxy-utils';

export { default as RSVP, onerrorDefault } from './lib/ext/rsvp'; // just for side effect of extending Ember.RSVP
