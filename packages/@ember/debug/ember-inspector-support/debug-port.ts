import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

export default class DebugPort extends BaseObject {
  declare port: any;
  declare portNamespace: string;
  declare messages: Record<string, Function>;
  constructor(data: any) {
    super(data);
    if (!data) {
      throw new Error('need to pass data');
    }
    this.port = this.namespace?.port;
    this.setupOrRemovePortListeners('on');
  }

  willDestroy() {
    super.willDestroy();
    this.setupOrRemovePortListeners('off');
  }

  sendMessage(name: string, message?: any) {
    if (this.isDestroyed) return;
    this.port.send(this.messageName(name), message);
  }

  messageName(name: string) {
    let messageName = name;
    if (this.portNamespace) {
      messageName = `${this.portNamespace}:${messageName}`;
    }
    return messageName;
  }

  /**
   * Setup or tear down port listeners. Call on `init` and `willDestroy`
   * @param {String} onOrOff 'on' or 'off' the functions to call i.e. port.on or port.off for adding or removing listeners
   */
  setupOrRemovePortListeners(onOrOff: 'on' | 'off') {
    let port = this.port;
    let messages = this.messages;

    for (let name in messages) {
      if (Object.prototype.hasOwnProperty.call(messages, name)) {
        port[onOrOff](this.messageName(name), this, messages[name]);
      }
    }
  }
}
