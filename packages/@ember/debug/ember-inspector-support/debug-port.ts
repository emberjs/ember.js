import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

export default class extends BaseObject {
  port = null;

  constructor(data) {
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

  sendMessage(name, message) {
    if (this.isDestroyed) return;
    this.port.send(this.messageName(name), message);
  }

  messageName(name) {
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
  setupOrRemovePortListeners(onOrOff) {
    let port = this.port;
    let messages = this.messages;

    for (let name in messages) {
      if (messages.hasOwnProperty(name)) {
        port[onOrOff](this.messageName(name), this, messages[name]);
      }
    }
  }
}
