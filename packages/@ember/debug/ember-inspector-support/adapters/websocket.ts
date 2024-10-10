import BasicAdapter from './basic';
import { onReady } from '@ember/debug/ember-inspector-support/utils/on-ready';
import { run } from '@ember/runloop';

export default class extends BasicAdapter {
  sendMessage(options = {}) {
    this.socket.emit('emberInspectorMessage', options);
  }

  get socket() {
    return (window as any).EMBER_INSPECTOR_CONFIG.remoteDebugSocket;
  }

  _listen() {
    this.socket.on('emberInspectorMessage', (message: any) => {
      // We should generally not be run-wrapping here. Starting a runloop in
      // ember-debug will cause the inspected app to revalidate/rerender. We
      // are generally not intending to cause changes to the rendered output
      // of the app, so this is generally unnecessary, and in big apps this
      // could be quite slow. There is nothing special about the `view:*`
      // messages – I (GC) just happened to have reviewed all of them recently
      // and can be quite sure that they don't need the runloop. We should
      // audit the rest of them and see if we can remove the else branch. I
      // think we most likely can. In the limited cases (if any) where the
      // runloop is needed, the callback code should just do the wrapping
      // themselves.
      if (message.type.startsWith('view:')) {
        this._messageReceived(message);
      } else {
        run(() => {
          this._messageReceived(message);
        });
      }
    });
  }

  _disconnect() {
    this.socket.removeAllListeners('emberInspectorMessage');
  }

  connect() {
    return new Promise((resolve, reject) => {
      onReady(() => {
        if (this.isDestroyed) {
          reject();
        }
        const EMBER_INSPECTOR_CONFIG = (window as any).EMBER_INSPECTOR_CONFIG;
        if (
          typeof EMBER_INSPECTOR_CONFIG === 'object' &&
          EMBER_INSPECTOR_CONFIG.remoteDebugSocket
        ) {
          resolve(true);
        }
      });
    }).then(() => {
      this._listen();
    });
  }

  willDestroy() {
    this._disconnect();
  }
}
