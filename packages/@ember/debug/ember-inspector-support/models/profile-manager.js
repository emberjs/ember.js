import ProfileNode from './profile-node';
import Ember from '@ember/debug/ember-inspector-support/utils/ember';
import { compareVersion } from '@ember/debug/ember-inspector-support/utils/version';

import { later, scheduleOnce, cancel } from '@ember/debug/ember-inspector-support/utils/ember/runloop';

function getEdges(first, last, closest) {
  let start = null;
  let end = null;
  for (let i = 0; i < closest.length; i++) {
    if (closest.item(i) === first.node) start = i;
    else if (closest.item(i) === last.node) end = i;
  }
  return [start, end];
}

function getUnfilteredRoots(first, last, closest) {
  if (first.node === last.node) return [first.node];

  const roots = [];

  const [start, end] = getEdges(first, last, closest);

  if (start === null || end === null) return [];

  for (let i = start; i <= end; i++) roots.push(closest.item(i));

  return roots;
}

function findRoots({ first, last, parent }) {
  const closest = parent.childNodes;

  const roots = getUnfilteredRoots(first, last, closest);

  return roots.filter((el) => el?.nodeType === 1);
}

function makeHighlight() {
  const node = document.createElement('div');
  node.setAttribute('role', 'presentation');
  node.setAttribute('class', 'ember-inspector-render-highlight');
  return node;
}
function insertHTML(node) {
  document.body.appendChild(node);
}

function insertStylesheet() {
  const content = `
    .ember-inspector-render-highlight {
      border: 2px solid rgba(255,0,0,0.2);
      box-shadow: 0px 0px 1px rgba(255,0,0,0.2);
      z-index: 1000000;
      pointer-events: none;
    }
  `;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(content));
  document.head.appendChild(style);
  return style;
}

/**
 * A class for keeping track of active rendering profiles as a list.
 */
export default class ProfileManager {
  constructor() {
    this.profiles = [];
    this.current = null;
    this.currentSet = [];
    this._profilesAddedCallbacks = [];
    this.queue = [];
    this.shouldHighlightRender = false;
    this.stylesheet = insertStylesheet();
    // keep track of all the active highlights
    this.highlights = [];
    this.isHighlightEnabled = compareVersion(Ember?.VERSION, '3.20.0') !== -1;
  }

  began(timestamp, payload, now) {
    return this.wrapForErrors(this, function () {
      this.current = new ProfileNode(timestamp, payload, this.current, now);
      if (this.shouldHighlightRender && payload.view) {
        this._highLightView(payload.view);
      }
      this.current.isHighlightEnabled = this.isHighlightEnabled;
      return this.current;
    });
  }

  ended(timestamp, payload, profileNode) {
    if (payload.exception) {
      throw payload.exception;
    }
    return this.wrapForErrors(this, function () {
      this.current = profileNode.parent;
      profileNode.finish(timestamp);

      // Are we done profiling an entire tree?
      if (!this.current) {
        this.currentSet.push(profileNode);
        // If so, schedule an update of the profile list
        scheduleOnce('afterRender', this, this._profilesFinished);
      }
    });
  }

  wrapForErrors(context, callback) {
    return callback.call(context);
  }

  _highLightView(view) {
    const symbols = Object.getOwnPropertySymbols(view);
    const bounds = view[symbols.find((sym) => sym.description === 'BOUNDS')];
    if (!bounds) return;

    const elements = findRoots(bounds);

    elements.forEach((node) => {
      this._renderHighlight(node);
    });
  }

  /**
   * Push a new profile into the queue
   * @param info
   * @return {number}
   */
  addToQueue(info) {
    const index = this.queue.push(info);
    if (index === 1) {
      later(this._flush.bind(this), 50);
    }
    return index - 1;
  }

  clearProfiles() {
    this.profiles.length = 0;
  }

  onProfilesAdded(context, callback) {
    this._profilesAddedCallbacks.push({ context, callback });
  }

  offProfilesAdded(context, callback) {
    let index = -1,
      item;
    for (let i = 0, l = this._profilesAddedCallbacks.length; i < l; i++) {
      item = this._profilesAddedCallbacks[i];
      if (item.context === context && item.callback === callback) {
        index = i;
      }
    }
    if (index > -1) {
      this._profilesAddedCallbacks.splice(index, 1);
    }
  }

  teardown() {
    this.stylesheet?.remove();
    // remove all the active highlighted components
    this._removeAllHighlights();
  }

  _removeAllHighlights() {
    const els = this.highlights.slice(0);
    els.forEach((el) => {
      this._removeHighlight(el);
    });
  }

  _removeHighlight(highlight) {
    this.highlights = this.highlights.filter((item) => item !== highlight);
    cancel(highlight.timeout);
    highlight.el.remove();
  }

  _addHighlight(highlight) {
    insertHTML(highlight.el);
    this.highlights.push(highlight);

    highlight.timeout = later(() => {
      this._removeHighlight(highlight);
    }, 500);
  }

  _constructHighlight(renderedNode) {
    const rect = renderedNode.getBoundingClientRect();
    const highlight = makeHighlight();

    const { top, left, width, height } = rect;
    const { scrollX, scrollY } = window;
    const { style } = highlight;
    if (style) {
      style.position = 'absolute';
      style.top = `${top + scrollY}px`;
      style.left = `${left + scrollX}px`;
      style.width = `${width}px`;
      style.height = `${height}px`;
    }
    return highlight;
  }

  _renderHighlight(renderedNode) {
    if (!renderedNode?.getBoundingClientRect) {
      return;
    }

    const highlight = this._constructHighlight(renderedNode);

    this._addHighlight({ el: highlight });
  }

  _flush() {
    let entry, i;
    for (i = 0; i < this.queue.length; i++) {
      entry = this.queue[i];
      if (entry.type === 'began') {
        // If there was an error during rendering `entry.endedIndex` never gets set.
        if (entry.endedIndex) {
          this.queue[entry.endedIndex].profileNode = this.began(
            entry.timestamp,
            entry.payload,
            entry.now
          );
        }
      } else {
        this.ended(entry.timestamp, entry.payload, entry.profileNode);
      }
    }
    this.queue.length = 0;
  }

  _profilesFinished() {
    return this.wrapForErrors(this, function () {
      const firstNode = this.currentSet[0];
      let parentNode = new ProfileNode(firstNode.start, {
        template: 'View Rendering',
      });

      parentNode.time = 0;
      this.currentSet.forEach((n) => {
        parentNode.time += n.time;
        parentNode.children.push(n);
      });
      parentNode.calcDuration();

      this.profiles.push(parentNode);
      this.profiles = this.profiles.slice(0, 100);
      this._triggerProfilesAdded([parentNode]);
      this.currentSet = [];
    });
  }

  _triggerProfilesAdded(profiles) {
    this._profilesAddedCallbacks.forEach(function (item) {
      item.callback.call(item.context, profiles);
    });
  }
}
