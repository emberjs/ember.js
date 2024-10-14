import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';
import { SourceMapConsumer } from 'source-map-js';
const notFoundError = new Error('Source map url not found');

export default class SourceMapSupport extends BaseObject {
  private _lastPromise!: Promise<any>;
  init() {
    super.init();
    this._lastPromise = Promise.resolve(undefined);
  }

  /**
   * Returns a promise that resolves to an array
   * of mapped sourcew.
   *
   * @param  {String} stack The stack trace
   * @return {RSVP.Promise}
   */
  map(stack: string): Promise<any> {
    let parsed = fromStackProperty(stack);
    let array: any = [];
    let lastPromise = null;
    parsed?.forEach((item) => {
      lastPromise = this._lastPromise
        .then(() => this.getSourceMap(item.url), null)
        .then((smc) => {
          if (smc) {
            let source = smc.originalPositionFor({
              line: item.line,
              column: item.column,
            });
            source.fullSource = relativeToAbsolute(item.url, source.source);
            array.push(source);
            return array;
          }
          return;
        }, null);
      this._lastPromise = lastPromise!;
    });
    return Promise.resolve(lastPromise).catch(function (e) {
      if (e === notFoundError) {
        return null;
      }
      throw e;
    });
  }

  sourceMapCache: Record<string, any> = {};

  getSourceMap(url: string) {
    let sourceMaps = this.sourceMapCache;
    if (sourceMaps[url] !== undefined) {
      return Promise.resolve(sourceMaps[url]);
    }
    return retrieveSourceMap(url).then(
      (response) => {
        if (response) {
          const map = JSON.parse(response.map);
          const sm = new SourceMapConsumer(map);
          sourceMaps[url] = sm;
          return sm;
        }
        return;
      },
      function () {
        sourceMaps[url] = null;
      }
    );
  }
}

function retrieveSourceMap(source: string) {
  let mapURL: string;
  return retrieveSourceMapURL(source)
    .then((sourceMappingURL) => {
      if (!sourceMappingURL) {
        throw notFoundError;
      }

      // Support source map URLs relative to the source URL
      mapURL = relativeToAbsolute(source, sourceMappingURL);
      return mapURL;
    }, null)
    .then(retrieveFile, null)
    .then((sourceMapData) => {
      if (!sourceMapData) {
        return null;
      }
      return {
        url: mapURL,
        map: sourceMapData,
      };
    }, null);
}

function relativeToAbsolute(file: string, url: string) {
  // Regex from https://stackoverflow.com/a/19709846
  // This will match the most common prefixes we care about: "http://", "https://", "//"
  let absoluteUrlRegex = new RegExp('^(?:[a-z]+:)?//', 'i');

  // If we don't have a file URL or the sourcemap URL is absolute, then return the sourcemap URL.
  if (!file || absoluteUrlRegex.test(url)) {
    return url;
  }

  // Otherwise, find the sourcemap URL relative to the original file.
  let dir = file.split('/');
  dir.pop();
  dir.push(url);
  return dir.join('/');
}

function retrieveFile(source: string) {
  return new Promise<string>(function (resolve) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(this.responseText);
    };
    xhr.open('GET', source, true);
    xhr.send();
  });
}

function retrieveSourceMapURL(source: string) {
  return retrieveFile(source).then(function (fileData: string) {
    let match = /\/\/[#@]\s*sourceMappingURL=(.*)\s*$/g.exec(fileData);
    if (!match) {
      return null;
    }
    let url = match[1] as string;
    // check not data URL
    if (url.match(/^data/)) {
      return null;
    }
    return url;
  }, null);
}

const UNKNOWN_FUNCTION = '<unknown>';

// Taken from https://github.com/errorception/browser-stack-parser/
function fromStackProperty(stackString: string) {
  let chrome =
    /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  let gecko = /^\s*(\S*)(?:\((.*?)\))?@((?:file|http|https).*?):(\d+)(?::(\d+))?\s*$/i;
  let lines = stackString.split('\n');
  let stack = [];
  let parts;

  for (let i = 0, j = lines.length; i < j; ++i) {
    if ((parts = gecko.exec(lines[i]!))) {
      stack.push({
        url: parts[3]!,
        func: parts[1] || UNKNOWN_FUNCTION,
        args: parts[2] ? parts[2].split(',') : [],
        line: Number(parts[4]),
        column: parts[5] ? Number(parts[5]) : null,
      });
    } else if ((parts = chrome.exec(lines[i]!))) {
      stack.push({
        url: parts[2]!,
        func: parts[1] || UNKNOWN_FUNCTION,
        line: Number(parts[3]),
        column: parts[4] ? Number(parts[4]) : null,
      });
    }
  }

  return stack.length
    ? (stack as {
        url: string;
        func: string;
        args: string[] | undefined;
        line: number;
        column: number | null;
      }[])
    : null;
}
