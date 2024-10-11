import DebugPort from './debug-port';
import ProfileManager from './models/profile-manager';

import { _backburner } from '@ember/runloop';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';
import { subscribe } from '@ember/instrumentation';

// Initial setup, that has to occur before the EmberObject init for some reason
let profileManager = new ProfileManager();
_subscribeToRenderEvents();

export default class RenderDebug extends DebugPort {
  profileManager: ProfileManager;
  constructor(data?: any) {
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

  sendAdded(profiles: any) {
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
      clear(this: RenderDebug) {
        this.profileManager.clearProfiles();
        this.sendMessage('profilesUpdated', { profiles: [] });
      },

      releaseProfiles(this: RenderDebug) {
        this.profileManager.offProfilesAdded(this, this.sendAdded);
      },

      watchProfiles(this: RenderDebug) {
        this.sendMessage('profilesAdded', {
          profiles: this.profileManager.profiles,
        });
        this.profileManager.onProfilesAdded(this, this.sendAdded);
      },

      updateShouldHighlightRender(
        this: RenderDebug,
        { shouldHighlightRender }: { shouldHighlightRender: boolean }
      ) {
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
    before(_name: string, timestamp: number, payload: any) {
      const info = {
        type: 'began',
        timestamp,
        payload,
        now: Date.now(),
      };
      return profileManager.addToQueue(info);
    },

    after(_name: string, timestamp, payload: any, beganIndex) {
      const endedInfo = {
        type: 'ended',
        timestamp,
        payload,
      };

      const index = profileManager.addToQueue(endedInfo);
      profileManager.queue[beganIndex]!.endedIndex = index;
    },
  });
}
