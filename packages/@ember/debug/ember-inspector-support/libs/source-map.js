import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';
import * as SourceMap from '@ember/debug/ember-inspector-support/deps/source-map';
const notFoundError = new Error('Source map url not found');

export default class extends BaseObject {
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
  map(stack) {
    let parsed = fromStackProperty(stack);
    let array = [];
    let lastPromise = null;
    parsed.forEach((item) => {
      lastPromise = this._lastPromise
        .then(() => this.getSourceMap(item.url), null, 'ember-inspector')
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
        }, null);
      this._lastPromise = lastPromise;
    });
    return Promise.resolve(lastPromise).catch(function (e) {
      if (e === notFoundError) {
        return null;
      }
      throw e;
    });
  }

  sourceMapCache = {};

  getSourceMap(url) {
    let sourceMaps = this.sourceMapCache;
    if (sourceMaps[url] !== undefined) {
      return Promise.resolve(sourceMaps[url]);
    }
    return retrieveSourceMap(url).then(
      (response) => {
        if (response) {
          const map = JSON.parse(response.map);
          const sm = new SourceMap.SourceMapConsumer(map);
          sourceMaps[url] = sm;
          return sm;
        }
      },
      function () {
        sourceMaps[url] = null;
      },
      'ember-inspector'
    );
  }
}

function retrieveSourceMap(source) {
  let mapURL;
  return retrieveSourceMapURL(source)
    .then(
      (sourceMappingURL) => {
        if (!sourceMappingURL) {
          throw notFoundError;
        }

        // Support source map URLs relative to the source URL
        mapURL = relativeToAbsolute(source, sourceMappingURL);
        return mapURL;
      },
      null,
      'ember-inspector'
    )
    .then(retrieveFile, null, 'ember-inspector')
    .then(
      (sourceMapData) => {
        if (!sourceMapData) {
          return null;
        }
        return {
          url: mapURL,
          map: sourceMapData,
        };
      },
      null,
      'ember-inspector'
    );
}

function relativeToAbsolute(file, url) {
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

function retrieveFile(source) {
  return new Promise(function (resolve) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(this.responseText, 'ember-inspector');
    };
    xhr.open('GET', source, true);
    xhr.send();
  }, 'ember-inspector');
}

function retrieveSourceMapURL(source) {
  return retrieveFile(source).then(
    function (fileData) {
      let match = /\/\/[#@]\s*sourceMappingURL=(.*)\s*$/g.exec(fileData);
      if (!match) {
        return null;
      }
      let url = match[1];
      // check not data URL
      if (url.match(/^data/)) {
        return null;
      }
      return url;
    },
    null,
    'ember-inspector'
  );
}

const UNKNOWN_FUNCTION = '<unknown>';

// Taken from https://github.com/errorception/browser-stack-parser/
function fromStackProperty(stackString) {
  let chrome =
    /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  let gecko =
    /^\s*(\S*)(?:\((.*?)\))?@((?:file|http|https).*?):(\d+)(?::(\d+))?\s*$/i;
  let lines = stackString.split('\n');
  let stack = [];
  let parts;

  for (let i = 0, j = lines.length; i < j; ++i) {
    if ((parts = gecko.exec(lines[i]))) {
      stack.push({
        url: parts[3],
        func: parts[1] || UNKNOWN_FUNCTION,
        args: parts[2] ? parts[2].split(',') : '',
        line: +parts[4],
        column: parts[5] ? +parts[5] : null,
      });
    } else if ((parts = chrome.exec(lines[i]))) {
      stack.push({
        url: parts[2],
        func: parts[1] || UNKNOWN_FUNCTION,
        line: +parts[3],
        column: parts[4] ? +parts[4] : null,
      });
    }
  }

  return stack.length ? stack : null;
}
