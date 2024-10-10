import BasicAdapter from '@ember/debug/ember-inspector-support/adapters/basic';
import Port from '@ember/debug/ember-inspector-support/port';
import ObjectInspector from '@ember/debug/ember-inspector-support/object-inspector';
import GeneralDebug from '@ember/debug/ember-inspector-support/general-debug';
import RenderDebug from '@ember/debug/ember-inspector-support/render-debug';
import ViewDebug from '@ember/debug/ember-inspector-support/view-debug';
import RouteDebug from '@ember/debug/ember-inspector-support/route-debug';
import DataDebug from '@ember/debug/ember-inspector-support/data-debug';
import PromiseDebug from '@ember/debug/ember-inspector-support/promise-debug';
import ContainerDebug from '@ember/debug/ember-inspector-support/container-debug';
import DeprecationDebug from '@ember/debug/ember-inspector-support/deprecation-debug';
import Session from '@ember/debug/ember-inspector-support/services/session';

import { Application, Namespace } from '@ember/debug/ember-inspector-support/utils/ember';
import {
  guidFor,
  setGuidPrefix,
} from '@ember/debug/ember-inspector-support/utils/ember/object/internals';
import { run } from '@ember/debug/ember-inspector-support/utils/ember/runloop';
import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

class EmberDebug extends BaseObject {
  /**
   * Set to true during testing.
   *
   * @type {Boolean}
   * @default false
   */
  isTesting = false;

  get applicationName() {
    return this._application.name || this._application.modulePrefix;
  }

  /**
   * We use the application's id instead of the owner's id so that we use the same inspector
   * instance for the same application even if it was reset (owner changes on reset).
   *
   * @property applicationId
   * @type {String}
   */
  get applicationId() {
    if (!this.isTesting) {
      return guidFor(this._application, 'ember');
    }
    return guidFor(this.owner, 'ember');
  }

  // Using object shorthand syntax here is somehow having strange side effects.
  // eslint-disable-next-line object-shorthand
  Port = Port;
  Adapter = BasicAdapter;

  start($keepAdapter) {
    if (this.started) {
      this.reset($keepAdapter);
      return;
    }
    if (!this._application && !this.isTesting) {
      this._application = getApplication();
    }
    this.started = true;

    this.reset();

    this.adapter.debug('Ember Inspector Active');
    this.adapter.sendMessage({
      type: 'inspectorLoaded',
    });
  }

  destroyContainer() {
    if (this.generalDebug) {
      this.generalDebug.sendReset();
    }
    [
      'dataDebug',
      'viewDebug',
      'routeDebug',
      'generalDebug',
      'renderDebug',
      'promiseDebug',
      'containerDebug',
      'deprecationDebug',
      'objectInspector',
      'session',
    ].forEach((prop) => {
      let handler = this[prop];
      if (handler) {
        run(handler, 'destroy');
        this[prop] = null;
      }
    });
  }

  startModule(prop, Module) {
    this[prop] = new Module({ namespace: this });
  }

  willDestroy() {
    this.destroyContainer();
    super.willDestroy();
  }

  reset($keepAdapter) {
    setGuidPrefix(Math.random().toString());
    if (!this.isTesting && !this.owner) {
      this.owner = getOwner(this._application);
    }
    this.destroyContainer();
    run(() => {
      // Adapters don't have state depending on the application itself.
      // They also maintain connections with the inspector which we will
      // lose if we destroy.
      if (!this.adapter || !$keepAdapter) {
        this.startModule('adapter', this.Adapter);
      }
      if (!this.port || !$keepAdapter) {
        this.startModule('port', this.Port);
      }

      this.startModule('session', Session);
      this.startModule('generalDebug', GeneralDebug);
      this.startModule('renderDebug', RenderDebug);
      this.startModule('objectInspector', ObjectInspector);
      this.startModule('routeDebug', RouteDebug);
      this.startModule('viewDebug', ViewDebug);
      this.startModule('dataDebug', DataDebug);
      this.startModule('promiseDebug', PromiseDebug);
      this.startModule('containerDebug', ContainerDebug);
      this.startModule('deprecationDebug', DeprecationDebug);

      this.generalDebug.sendBooted();
    });
  }

  inspect(obj) {
    this.objectInspector.sendObject(obj);
    this.adapter.log('Sent to the Object Inspector');
    return obj;
  }

  clear() {
    Object.assign(this, {
      _application: null,
      owner: null,
    });
  }
}

function getApplication() {
  let namespaces = Namespace.NAMESPACES;
  let application;

  namespaces.forEach((namespace) => {
    if (namespace instanceof Application) {
      application = namespace;
      return false;
    }
  });
  return application;
}

function getOwner(application) {
  if (application.autoboot) {
    return application.__deprecatedInstance__;
  } else if (application._applicationInstances /* Ember 3.1+ */) {
    return [...application._applicationInstances][0];
  }
}

export default new EmberDebug();
