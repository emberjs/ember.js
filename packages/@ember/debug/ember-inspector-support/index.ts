import { VERSION } from '@ember/version';
import Adapters from './adapters';
import MainModule from './main';
import { guidFor } from '@ember/object/internals';
import { A } from '@ember/array';
import Namespace from '@ember/application/namespace';
import Application from '@ember/application';
import type ApplicationInstance from '@ember/application/instance';

export function setupEmberInspectorSupport() {
  (window as any).EMBER_INSPECTOR_SUPPORT_BUNDLED = true;
  window.addEventListener('ember-inspector-loaded' as any, (event: CustomEvent) => {
    const adapter = event.detail.adapter;
    const EMBER_VERSIONS_SUPPORTED = event.detail.EMBER_VERSIONS_SUPPORTED;
    loadEmberDebug(adapter, EMBER_VERSIONS_SUPPORTED);
  });

  const e = new Event('ember-inspector-support-setup');
  window.dispatchEvent(e);
}

function loadEmberDebug(
  adapter: keyof typeof Adapters,
  EMBER_VERSIONS_SUPPORTED: [string, string]
) {
  const w = window as any;
  // global to prevent injection
  if (w.NO_EMBER_DEBUG) {
    return;
  }

  if (!versionTest(VERSION, EMBER_VERSIONS_SUPPORTED)) {
    // Wrong inspector version. Redirect to the correct version.
    sendVersionMiss();
    return;
  }

  // prevent from injecting twice
  if (!w.EmberInspector) {
    w.EmberInspector = MainModule;
    w.EmberInspector.Adapter = Adapters[adapter];

    onApplicationStart(function appStarted(instance: ApplicationInstance) {
      let app = instance.application;
      if (!('__inspector__booted' in app)) {
        // Watch for app reset/destroy
        app.reopen({
          reset: function (this: Application) {
            (this as any).__inspector__booted = false;
            this._super.apply(this, arguments as any);
          },
        });
      }

      if (instance && !('__inspector__booted' in instance)) {
        instance.reopen({
          // Clean up on instance destruction
          willDestroy() {
            if (w.EmberInspector.owner === instance) {
              w.EmberInspector.destroyContainer();
              w.EmberInspector.clear();
            }
            return (this as any)._super.apply(this, arguments);
          },
        });

        if (!w.EmberInspector._application) {
          setTimeout(() => bootEmberInspector(instance), 0);
        }
      }
    });
  }

  function bootEmberInspector(appInstance: ApplicationInstance) {
    (appInstance.application as any).__inspector__booted = true;
    (appInstance as any).__inspector__booted = true;

    // Boot the inspector (or re-boot if already booted, for example in tests)
    w.EmberInspector._application = appInstance.application;
    w.EmberInspector.owner = appInstance;
    w.EmberInspector.start(true);
  }

  // There's probably a better way
  // to determine when the application starts
  // but this definitely works
  function onApplicationStart(callback: Function) {
    const adapterInstance = new Adapters[adapter]();

    adapterInstance.onMessageReceived(function (message) {
      if (message.type === 'app-picker-loaded') {
        sendApps(adapterInstance, getApplications());
      }

      if (message.type === 'app-selected') {
        let current = w.EmberInspector._application;
        let selected = getApplications().find((app: any) => guidFor(app) === message.applicationId);

        if (selected && current !== selected && selected.__deprecatedInstance__) {
          bootEmberInspector(selected.__deprecatedInstance__);
        }
      }
    });

    let apps = getApplications();

    sendApps(adapterInstance, apps);

    function loadInstance(app: Application) {
      const applicationInstances = app._applicationInstances && [...app._applicationInstances];
      let instance = app.__deprecatedInstance__ || applicationInstances[0];
      if (instance) {
        // App started
        setupInstanceInitializer(app, callback);
        callback(instance);
        return true;
      }
      return;
    }

    let app: Application;
    for (let i = 0, l = apps.length; i < l; i++) {
      app = apps[i];
      // We check for the existance of an application instance because
      // in Ember > 3 tests don't destroy the app when they're done but the app has no booted instances.
      if (app._readinessDeferrals === 0) {
        if (loadInstance(app)) {
          break;
        }
      }

      // app already run initializers, but no instance, use _bootPromise and didBecomeReady
      if (app._bootPromise) {
        app._bootPromise.then((app) => {
          loadInstance(app);
        });
      }

      app.reopen({
        didBecomeReady(this: Application) {
          this._super.apply(this, arguments as any);
          setTimeout(() => loadInstance(app), 0);
        },
      });
    }
    Application.initializer({
      name: 'ember-inspector-booted',
      initialize: function (app) {
        setupInstanceInitializer(app, callback);
      },
    });
  }

  function setupInstanceInitializer(app: Application, callback: Function) {
    if (!(app as any).__inspector__setup) {
      (app as any).__inspector__setup = true;

      // We include the app's guid in the initializer name because in Ember versions < 3
      // registering an instance initializer with the same name, even if on a different app,
      // triggers an error because instance initializers seem to be global instead of per app.
      app.instanceInitializer({
        name: 'ember-inspector-app-instance-booted-' + guidFor(app),
        initialize: function (instance) {
          callback(instance);
        },
      });
    }
  }

  /**
   * Get all the Ember.Application instances from Ember.Namespace.NAMESPACES
   * and add our own applicationId and applicationName to them
   * @return {*}
   */
  function getApplications() {
    let namespaces = A(Namespace.NAMESPACES);

    let apps = namespaces.filter(function (namespace) {
      return namespace instanceof Application;
    });

    return apps.map(function (app: any) {
      // Add applicationId and applicationName to the app
      let applicationId = guidFor(app);
      let applicationName = app.name || app.modulePrefix || `(unknown app - ${applicationId})`;

      Object.assign(app, {
        applicationId,
        applicationName,
      });

      return app;
    });
  }

  let channel = new MessageChannel();
  let port = channel.port1;
  window.postMessage('debugger-client', '*', [channel.port2]);

  let registeredMiss = false;

  /**
   * This function is called if the app's Ember version
   * is not supported by this version of the inspector.
   *
   * It sends a message to the inspector app to redirect
   * to an inspector version that supports this Ember version.
   */
  function sendVersionMiss() {
    if (registeredMiss) {
      return;
    }

    registeredMiss = true;

    port.addEventListener('message', (message) => {
      if (message.type === 'check-version') {
        sendVersionMismatch();
      }
    });

    sendVersionMismatch();

    port.start();

    function sendVersionMismatch() {
      port.postMessage({
        name: 'version-mismatch',
        version: VERSION,
        from: 'inspectedWindow',
      });
    }
  }

  function sendApps(adapter: any, apps: any[]) {
    const serializedApps = apps.map((app) => {
      return {
        applicationName: app.applicationName,
        applicationId: app.applicationId,
      };
    });

    adapter.sendMessage({
      type: 'apps-loaded',
      apps: serializedApps,
      from: 'inspectedWindow',
    });
  }

  /**
   * Checks if a version is between two different versions.
   * version should be >= left side, < right side
   *
   * @param {String} version1
   * @param {String} version2
   * @return {Boolean}
   */
  function versionTest(version: string, between: [string, string]) {
    let fromVersion = between[0];
    let toVersion = between[1];

    if (compareVersion(version, fromVersion) === -1) {
      return false;
    }
    return !toVersion || compareVersion(version, toVersion) === -1;
  }

  /**
   * Compares two Ember versions.
   *
   * Returns:
   * `-1` if version1 < version
   * 0 if version1 == version2
   * 1 if version1 > version2
   *
   * @param {String} version1
   * @param {String} version2
   * @return {Boolean} result of the comparison
   */
  function compareVersion(version1: string, version2: string) {
    let compared, i;
    let version1Split = cleanupVersion(version1).split('.');
    let version2Split = cleanupVersion(version2).split('.');
    for (i = 0; i < 3; i++) {
      compared = compare(Number(version1Split[i]), Number(version2Split[i]));
      if (compared !== 0) {
        return compared;
      }
    }
    return 0;
  }

  /**
   * Remove -alpha, -beta, etc from versions
   *
   * @param {String} version
   * @return {String} The cleaned up version
   */
  function cleanupVersion(version: string) {
    return version.replace(/-.*/g, '');
  }

  /**
   * @method compare
   * @param {Number} val
   * @param {Number} number
   * @return {Number}
   *  0: same
   * -1: <
   *  1: >
   */
  function compare(val: number, number: number) {
    if (val === number) {
      return 0;
    } else if (val < number) {
      return -1;
    } else if (val > number) {
      return 1;
    }
    return;
  }
}
