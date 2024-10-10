import DebugPort from './debug-port';
import ProfileManager from './models/profile-manager';

import { subscribe } from '@ember/debug/ember-inspector-support/utils/ember/instrumentation';
import { _backburner } from '@ember/debug/ember-inspector-support/utils/ember/runloop';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';

// Initial setup, that has to occur before the EmberObject init for some reason
let profileManager = new ProfileManager();
_subscribeToRenderEvents();

export default class extends DebugPort {
  constructor(data) {
    super(data);
    this.profileManager = profileManager;
    this.profileManager.wrapForErrors = (context, callback) =>
      this.port.wrap(() => callback.call(context));
    _backburner.on('end', bound(this, this._updateComponentTree));
  }

  willDestroy() {
    super.willDestroy();

    this.profileManager.wrapForErrors = function (context, callback) {
      return callback.call(context);
    };

    this.profileManager.offProfilesAdded(this, this.sendAdded);
    this.profileManager.teardown();

    _backburner.off('end', bound(this, this._updateComponentTree));
  }

  sendAdded(profiles) {
    this.sendMessage('profilesAdded', {
      profiles,
      isHighlightSupported: this.profileManager.isHighlightEnabled,
    });
  }

  /**
   * Update the components tree. Called on each `render.component` event.
   * @private
   */
  _updateComponentTree() {
    this.namespace?.viewDebug?.sendTree();
  }

  static {
    this.prototype.portNamespace = 'render';
    this.prototype.messages = {
      clear() {
        this.profileManager.clearProfiles();
        this.sendMessage('profilesUpdated', { profiles: [] });
      },

      releaseProfiles() {
        this.profileManager.offProfilesAdded(this, this.sendAdded);
      },

      watchProfiles() {
        this.sendMessage('profilesAdded', {
          profiles: this.profileManager.profiles,
        });
        this.profileManager.onProfilesAdded(this, this.sendAdded);
      },

      updateShouldHighlightRender({ shouldHighlightRender }) {
        this.profileManager.shouldHighlightRender = shouldHighlightRender;
      },
    };
  }
}

/**
 * This subscribes to render events, so every time the page rerenders, it will push a new profile
 * @return {*}
 * @private
 */
function _subscribeToRenderEvents() {
  subscribe('render', {
    before(name, timestamp, payload) {
      const info = {
        type: 'began',
        timestamp,
        payload,
        now: Date.now(),
      };
      return profileManager.addToQueue(info);
    },

    after(name, timestamp, payload, beganIndex) {
      const endedInfo = {
        type: 'ended',
        timestamp,
        payload,
      };

      const index = profileManager.addToQueue(endedInfo);
      profileManager.queue[beganIndex].endedIndex = index;
    },
  });
}
