/* eslint no-console: 0 */
import { onReady } from '@ember/debug/ember-inspector-support/utils/on-ready';
import BaseObject from '../utils/base-object';

export default class BasicAdapter extends BaseObject {
  init() {
    Promise.resolve(this.connect()).then(() => {
      this.onConnectionReady();
    }, null);

    this._messageCallbacks = [];
  }

  /**
   * Uses the current build's config module to determine
   * the environment.
   *
   * @property environment
   * @type {String}
   */
  get environment() {
    if (!this.__environment) {
      this.__environment =
        requireModule('@ember/debug/ember-inspector-support/config')['default'].environment;
    }
    return this.__environment;
  }

  debug() {
    return console.debug(...arguments);
  }

  log() {
    return console.log(...arguments);
  }

  /**
   * A wrapper for `console.warn`.
   *
   * @method warn
   */
  warn() {
    return console.warn(...arguments);
  }

  /**
    Used to send messages to EmberExtension

    @param {Object} type the message to the send
  */
  sendMessage(/* options */) {}

  /**
    Register functions to be called
    when a message from EmberExtension is received

    @param {Function} callback
  */
  onMessageReceived(callback) {
    this._messageCallbacks.push(callback);
  }

  /**
    Inspect a js value or specific DOM node. This usually
    means using the current environment's tools
    to inspect the node in the DOM.

    For example, in chrome, `inspect(node)`
    will open the Elements tab in dev tools
    and highlight the DOM node.
    For functions, it will open the sources tab and goto the definition
    @param {Node|Function} node
  */
  inspectValue(/* value */) {}

  _messageReceived(message) {
    this._messageCallbacks.forEach((callback) => {
      callback(message);
    });
  }

  /**
   * Handle an error caused by EmberDebug.
   *
   * This function rethrows in development and test envs,
   * but warns instead in production.
   *
   * The idea is to control errors triggered by the inspector
   * and make sure that users don't get mislead by inspector-caused
   * bugs.
   *
   * @method handleError
   * @param {Error} error
   */
  handleError(error) {
    if (this.environment === 'production') {
      if (error && error instanceof Error) {
        error = `Error message: ${error.message}\nStack trace: ${error.stack}`;
      }
      this.warn(
        `Ember Inspector has errored.\n` +
          `This is likely a bug in the inspector itself.\n` +
          `You can report bugs at https://github.com/emberjs/ember-inspector.\n${error}`
      );
    } else {
      this.warn('EmberDebug has errored:');
      throw error;
    }
  }

  /**

    A promise that resolves when the connection
    with the inspector is set up and ready.

    @return {Promise}
  */
  connect() {
    return new Promise((resolve, reject) => {
      onReady(() => {
        if (this.isDestroyed) {
          reject();
        }
        this.interval = setInterval(() => {
          if (document.documentElement.dataset.emberExtension) {
            clearInterval(this.interval);
            resolve();
          }
        }, 10);
      });
    });
  }

  willDestroy() {
    super.willDestroy();
    clearInterval(this.interval);
  }

  _isReady = false;
  _pendingMessages = [];

  send(options) {
    if (this._isReady) {
      this.sendMessage(...arguments);
    } else {
      this._pendingMessages.push(options);
    }
  }

  /**
    Called when the connection is set up.
    Flushes the pending messages.
  */
  onConnectionReady() {
    // Flush pending messages
    const messages = this._pendingMessages;
    messages.forEach((options) => this.sendMessage(options));
    messages.length = 0;
    this._isReady = true;
  }
}
