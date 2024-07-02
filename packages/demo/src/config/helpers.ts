// import EmberGlimmerComponentManager from 'ember-component-manager';
import Component from '@glimmer/component';
import { setOwner, getOwner } from '@ember/owner';
import { capabilities } from '@ember/component';
import { setComponentManager } from '@ember/component';
import { Ember } from '../../types/global';
import config from './env';

class CustomComponentManager {
  constructor() {
    debugger;
  }
  capabilities = capabilities('3.13');

  createComponent(
    ...args: Parameters<EmberGlimmerComponentManager['createComponent']>
  ) {
    const component = super.createComponent(...args);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setOwner(component, getOwner(this)!);

    return component;
  }
}

export function setupApplicationGlobals(EmberNamespace: Ember) {
  setComponentManager((owner) => {
    return new CustomComponentManager(owner);
  }, Component);

  window.EmberENV = config.EmberENV;
  window._Ember = EmberNamespace;
  window.Ember = EmberNamespace;
}
