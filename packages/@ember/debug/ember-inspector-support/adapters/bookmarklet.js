import BasicAdapter from './basic';

export default class extends BasicAdapter {
  init() {
    super.init();
    this._listen();
  }

  sendMessage(options) {
    options = options || {};
    window.emberInspector.w.postMessage(options, window.emberInspector.url);
  }

  _listen() {
    window.addEventListener('message', (e) => {
      if (e.origin !== window.emberInspector.url) {
        return;
      }
      const message = e.data;
      if (message.from === 'devtools') {
        this._messageReceived(message);
      }
    });

    window.onunload = () => {
      this.sendMessage({
        unloading: true,
      });
    };
  }
}
