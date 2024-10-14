import BasicAdapter from './basic';
import { run } from '@ember/runloop';

export default class WebExtension extends BasicAdapter {
  declare private _channel: MessageChannel;
  declare private _chromePort: MessagePort;
  init() {
    this._channel = new MessageChannel();
    this._chromePort = this._channel?.port1;
    super.init();
  }

  connect() {
    const channel = this._channel;
    return super.connect().then(() => {
      window.postMessage('debugger-client', '*', [channel.port2]);
      this._listen();
    }, null);
  }

  sendMessage(options = {}) {
    // If prototype extensions are disabled, `Ember.A()` arrays
    // would not be considered native arrays, so it's not possible to
    // "clone" them through postMessage unless they are converted to a
    // native array.
    try {
      this._chromePort.postMessage(options);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('failed to send message', e);
    }
  }

  /**
   * Open the devtools "Elements" and select an DOM node.
   *
   * @param  {Node|Function} value The DOM node to select
   */
  inspectValue(value: any) {
    // NOTE:
    //
    // Basically, we are just trying to call `inspect(node)` here.
    // However, `inspect` is a special function that is in the global
    // scope but not on the global object (i.e. `window.inspect`) does
    // not work. This sometimes causes problems, because, e.g. if the
    // page has a div with the ID `inspect`, `window.inspect` will point
    // to that div and shadow the "global" inspect function with no way
    // to get it back. That causes "`inspect` is not a function" errors.
    //
    // As it turns out, however, when the extension page evals, the
    // `inspect` function does not get shadowed. So, we can ask the
    // inspector extension page to call that function for us, using
    // `inspected.Window.eval('inspect(node)')`.
    //
    // However, since we cannot just send the DOM node directly to the
    // extension, we will have to store it in a temporary global variable
    // so that the extension can find it.

    let name = `__EMBER_INSPECTOR_${(Math.random() * 100000000).toFixed(0)}`;

    (window as any)[name] = value;
    this.namespace.port.send('view:inspectJSValue', { name });
  }

  _listen() {
    let chromePort = this._chromePort;

    chromePort.addEventListener('message', (event) => {
      const message = event.data;

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

    chromePort.start();
  }
}
