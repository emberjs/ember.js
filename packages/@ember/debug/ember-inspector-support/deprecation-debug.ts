import DebugPort from './debug-port';
import SourceMap from '@ember/debug/ember-inspector-support/libs/source-map';

import { registerDeprecationHandler } from '@ember/debug';
import { guidFor } from '@ember/debug/ember-inspector-support/utils/ember/object/internals';
import { cancel, debounce } from '@ember/runloop';
import type SourceMapSupport from '@ember/debug/ember-inspector-support/libs/source-map';

export default class DeprecationDebug extends DebugPort {
  declare options: any;
  declare private _warned: boolean;
  declare debounce: any;
  declare private _watching: any;
  declare deprecationsToSend: {
    stackStr: string;
    message: string;
    url: string;
    count: number;
    id: string;
    sources: any[];
  }[];
  declare private sourceMap: SourceMapSupport;
  declare groupedDeprecations: any;
  declare deprecations: any;
  declare private __emberCliConfig: any;
  static {
    this.prototype.portNamespace = 'deprecation';
    this.prototype.sourceMap = new SourceMap();
    this.prototype.messages = {
      watch(this: DeprecationDebug) {
        this._watching = true;
        let grouped = this.groupedDeprecations;
        let deprecations = [];
        for (let i in grouped) {
          if (!Object.prototype.hasOwnProperty.call(grouped, i)) {
            continue;
          }
          deprecations.push(grouped[i]);
        }
        this.sendMessage('deprecationsAdded', {
          deprecations,
        });
        this.sendPending();
      },

      sendStackTraces(
        this: DeprecationDebug,
        message: { deprecation: { message: string; sources: { stackStr: string }[] } }
      ) {
        let deprecation = message.deprecation;
        deprecation.sources.forEach((source) => {
          let stack = source.stackStr;
          let stackArray = stack.split('\n');
          stackArray.unshift(`Ember Inspector (Deprecation Trace): ${deprecation.message || ''}`);
          this.adapter.log(stackArray.join('\n'));
        });
      },

      getCount(this: DeprecationDebug) {
        this.sendCount();
      },

      clear(this: DeprecationDebug) {
        cancel(this.debounce);
        this.deprecations.length = 0;
        this.groupedDeprecations = {};
        this.sendCount();
      },

      release(this: DeprecationDebug) {
        this._watching = false;
      },

      setOptions(this: DeprecationDebug, { options }: any) {
        this.options.toggleDeprecationWorkflow = options.toggleDeprecationWorkflow;
      },
    };
  }

  get adapter() {
    return this.port?.adapter;
  }

  get emberCliConfig() {
    return this.__emberCliConfig || this.namespace?.generalDebug.emberCliConfig;
  }

  set emberCliConfig(value) {
    this.__emberCliConfig = value;
  }

  constructor(data: any) {
    super(data);

    this.deprecations = [];
    this.deprecationsToSend = [];
    this.groupedDeprecations = {};
    this.options = {
      toggleDeprecationWorkflow: false,
    };

    this.handleDeprecations();
  }

  /**
   * Checks if ember-cli and looks for source maps.
   */
  fetchSourceMap(stackStr: string) {
    if (this.emberCliConfig && this.emberCliConfig.environment === 'development') {
      return this.sourceMap.map(stackStr).then((mapped: any[]) => {
        if (mapped && mapped.length > 0) {
          let source = mapped.find(
            (item: any) =>
              item.source &&
              Boolean(item.source.match(new RegExp(this.emberCliConfig.modulePrefix)))
          );

          if (source) {
            source.found = true;
          } else {
            source = mapped[0];
            source.found = false;
          }
          return source;
        }
      }, null);
    } else {
      return Promise.resolve(null);
    }
  }

  sendPending() {
    if (this.isDestroyed) {
      return;
    }

    let deprecations: { stackStr: string }[] = [];

    let promises = Promise.all(
      this.deprecationsToSend.map((deprecation) => {
        let obj: any;
        let promise = Promise.resolve(undefined);
        let grouped = this.groupedDeprecations;
        this.deprecations.push(deprecation);
        const id = guidFor(deprecation.message);
        obj = grouped[id];
        if (obj) {
          obj.count++;
          obj.url = obj.url || deprecation.url;
        } else {
          obj = deprecation;
          obj.count = 1;
          obj.id = id;
          obj.sources = [];
          grouped[id] = obj;
        }
        let found = obj.sources.find((s: any) => s.stackStr === deprecation.stackStr);
        if (!found) {
          let stackStr = deprecation.stackStr;
          promise = this.fetchSourceMap(stackStr).then((map) => {
            obj.sources.push({ map, stackStr });
            if (map) {
              obj.hasSourceMap = true;
            }
            return undefined;
          }, null);
        }
        return promise.then(() => {
          delete obj.stackStr;
          if (!deprecations.includes(obj)) {
            deprecations.push(obj);
          }
        }, null);
      })
    );

    promises.then(() => {
      this.sendMessage('deprecationsAdded', { deprecations });
      this.deprecationsToSend.length = 0;
      this.sendCount();
    }, null);
  }

  sendCount() {
    if (this.isDestroyed) {
      return;
    }

    this.sendMessage('count', {
      count: this.deprecations.length + this.deprecationsToSend.length,
    });
  }

  willDestroy() {
    cancel(this.debounce);
    return super.willDestroy();
  }

  handleDeprecations() {
    registerDeprecationHandler((message, options, next) => {
      if (!this.adapter) {
        next(message, options);
        return;
      }

      /* global __fail__*/

      let error: any;

      try {
        // @ts-expect-error When using new Error, we can't do the arguments check for Chrome. Alternatives are welcome
        __fail__.fail();
      } catch (e) {
        error = e;
      }

      let stack;
      let stackStr = '';
      if (error.stack) {
        // var stack;
        if (error['arguments']) {
          // Chrome
          stack = error.stack
            .replace(/^\s+at\s+/gm, '')
            .replace(/^([^(]+?)([\n$])/gm, '{anonymous}($1)$2')
            .replace(/^Object.<anonymous>\s*\(([^)]+)\)/gm, '{anonymous}($1)')
            .split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack
            .replace(/(?:\n@:0)?\s+$/m, '')
            .replace(/^\(/gm, '{anonymous}(')
            .split('\n');
        }

        stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
      }

      let url;
      if (options && typeof options === 'object') {
        url = options.url;
      }

      const deprecation = { message, stackStr, url } as any;

      // For ember-debug testing we usually don't want
      // to catch deprecations
      if (!this.namespace?.IGNORE_DEPRECATIONS) {
        this.deprecationsToSend.push(deprecation);
        cancel(this.debounce);
        if (this._watching) {
          this.debounce = debounce(this, this.sendPending, 100);
        } else {
          this.debounce = debounce(this, this.sendCount, 100);
        }
        if (!this._warned) {
          this.adapter.warn(
            'Deprecations were detected, see the Ember Inspector deprecations tab for more details.'
          );
          this._warned = true;
        }
      }

      if (this.options.toggleDeprecationWorkflow) {
        next(message, options);
      }
    });
  }
}
