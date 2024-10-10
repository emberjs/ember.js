import BasicAdapter from './basic';

export default class extends BasicAdapter {
  init() {
    super.init();
    this._listen();
  }

  sendMessage(options: any) {
    options = options || {};
    const w = window as any;
    w.emberInspector.w.postMessage(options, w.emberInspector.url);
  }

  _listen() {
    const w = window as any;
    window.addEventListener('message', (e) => {
      if (e.origin !== w.emberInspector.url) {
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
