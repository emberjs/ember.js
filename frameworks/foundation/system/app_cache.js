// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2012 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
sc_require("tasks/task");


/** @private */
SC.AppCacheTask = SC.Task.extend({
  run: function () {
    window.applicationCache.update();
    SC.appCache._appCacheStatusDidChange();
  }
});


/** @class

  This is a very simple object that makes it easier to use the
  window.applicationCache in a SproutCore application.

  The reason this object exists is that SproutCore applications
  are excellent candidates for offline access but, it takes more than a little
  effort to understand the application cache's various possible states and
  events in order to use it effectively.

  You will likely find a use for SC.appCache in two scenarios.  The first is
  you want to ensure that your users are notified each time a new version of
  your application is deployed in order to ensure they get the latest version.
  Because of the manner in which the application cache works, a user may launch
  a previous version from the cache and not see the new version.  In this
  scenario, you would simply check the value of SC.appCache.get('hasNewVersion')
  at some point in your app's initialization cycle.  If hasNewVersion is true,
  you can then check SC.appCache.get('isNewVersionValid') to determine whether
  to show a message to the user informing them of the new version and reload
  the app or to log that the new version failed to upload so you can fix it.

  Note, because the application cache takes some time to determine if a new
  version exists, hasNewVersion may initially be `undefined`.  Therefore, you
  will likely want to add an observer to the property and continue on with
  your app.  By using an observer, you can also tap into another feature of
  SC.appCache, which is to lazily check for updates after the app is loaded.
  Typically, the browser only checks for updates on the initial load of a page,
  but by setting SC.appCache.set('shouldPoll', true), you can have SC.appCache
  check for updates in the background at a set interval.  Your observer will
  then fire if hasNewVersion ever changes while the app is in use.

  For example,

      // A sample application.
      MyApp = SC.Application.create({

        // Called when the value of SC.appCache.hasNewVersion changes.
        appCacheHasNewVersionDidChange: function () {
          var hasNewVersion = SC.appCache.get('hasNewVersion'),
            isNewVersionValid = SC.appCache.get('isNewVersionValid');

          if (hasNewVersion) {
            if (isNewVersionValid) {
              // Show a message to the user.
              MyApp.mainPage.get('newVersionAvailablePanel').append();
            } else {
              // There is a new version available, but it failed to load.
              SC.error('Failed to update application cache.');
            }

            // Clean up.
            SC.appCache.removeObserver('hasNewVersion', this, 'appCacheHasNewVersionDidChange');
          } else {
            // Start polling for new versions.  Because the observer is still attached,
            // appCacheHasNewVersionDidChange will be called if a new version ever becomes available.
            SC.appCache.set('shouldPoll', true);
          }

        }

      });

      // The loading state in our sample application.
      MyApp.LoadingState = SC.State.extend({

        enterState: function () {
          var hasNewVersion = SC.appCache.get('hasNewVersion');

          if (SC.none(hasNewVersion)) {
            // The application cache is either caching for the first time , updating or idle.
            // In either case we will observe it.
            SC.appCache.addObserver('hasNewVersion', MyApp, 'appCacheHasNewVersionDidChange');
          } else if (hasNewVersion) {
            // There is already a new version available, use our existing code to handle it.
            MyApp.appCacheHasNewVersionDidChange();
          } else {
            // There is no new version, but it's possible that one will appear.
            // User our existing code to start polling for new versions.
            MyApp.appCacheHasNewVersionDidChange();
            SC.appCache.addObserver('hasNewVersion', MyApp, 'appCacheHasNewVersionDidChange');
          }
        }

      });

  The second scenario is if you want to present a UI indicating when the app is
  ready for offline use.  Remember that it takes some time for the browser
  to retrieve all the resources in the manifest, so an app may be running for
  a while before it is ready for offline use.  In this scenario, you would
  observe the isReadyForOffline property of SC.appCache.

  Like hasNewVersion, isReadyForOffline has three possible values: undefined, true or false,
  where the property is undefined while the value is still undetermined.

  For example,

      // A sample view.
      MyApp.MyView = SC.View.extend({

        childView: ['offlineIndicatorCV'],

        // An image we use to indicate when the app is safe to use offline.
        offlineIndicatorCV: SC.ImageView.extend({
          valueBinding: SC.Binding.oneWay('SC.appCache.isReadyForOffline').
            transform(function (isReadyForOffline) {
              if (isReadyForOffline) {
                return 'offline-ready';
              } else if (SC.none(isReadyForOffline)) {
                return 'offline-unknown';
              } else {
                return 'offline-not-ready';
              }
            })
        })

      });

  The following are some excellent resources on the application cache that were
  used to develop this class:

  - [Using the application cache - HTML | MDN](https://developer.mozilla.org/en-US/docs/HTML/Using_the_application_cache)
  - [Appcache Facts](http://appcachefacts.info)
  - [Offline Web Applications - Dive Into HTML5](http://diveintohtml5.info/offline.html)

  @extends SC.Object
  @since Version 1.10
*/
SC.appCache = SC.Object.create(
/** @scope SC.appCache.prototype */{

  // ------------------------------------------------------------------------
  // Properties
  //

  /**
    Whether the new version is valid or not.

    This property is undefined until it can be determined that a new version exists
    or doesn't exist and if it does exist, whether it is valid or not.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  isNewVersionValid: function () {
    var hasNewVersion = this.get('hasNewVersion'),
      ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (hasNewVersion) {
        if (status === window.applicationCache.UPDATEREADY) {
          ret = true;
        } else {
          ret = false;
        }
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('hasNewVersion').cacheable(),

  /**
    Whether the application may be run offline or not.

    This property is undefined until it can be determined that the application
    has been cached or not cached.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  isReadyForOffline: function () {
    var ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (status === window.applicationCache.IDLE ||
          status === window.applicationCache.UPDATEREADY) {
        ret = true;
      } else if (status === window.applicationCache.UNCACHED ||
          status === window.applicationCache.OBSOLETE) {
        ret = false;
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('status').cacheable(),

  /**
    Whether there is a new version of the application's cache or not.

    This property is undefined until it can be determined that a new version exists
    or not.  Note that the new version may not necessarily be valid.  You
    should check isNewVersionValid after determining that hasNewVersion is
    true.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  hasNewVersion: function () {
    var ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (status === window.applicationCache.UPDATEREADY ||
          status === window.applicationCache.OBSOLETE) {
        // It is only true if there is an update (which may have failed).
        ret = true;
      } else if (status === window.applicationCache.IDLE) {
        // It is only false if there was no update.
        ret = false;
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('status').cacheable(),

  /**
    The interval in milliseconds to poll for updates when shouldPoll is true.

    @type Number
    @default 1800000 (30 minutes)
    */
  interval: 1800000,

  /**
    The progress of the application cache between 0.0 (0%) and 1.0 (100%).

    @type Number
    @default 0.0
    */
  progress: 0,

  /**
    Whether or not to regularly check for updates to the application cache
    while the application is running.

    This is useful for applications that are left open for several hours at a
    time, such as a SproutCore application being used in business.  In order to
    ensure that the users have the latest version, you can set this property
    to true to have the application regularly check for updates.

    Updates are run using the background task queue, so as to pose the smallest
    detriment possible to performance.

    @field
    @type Boolean
    @default false
    */
  shouldPoll: function (key, value) {
    if (SC.none(value)) {
      // Default value.
      value = false;
    } else if (value) {
      var status = this.get('status');
      if (status === window.applicationCache.IDLE) {
        // Start regularly polling for updates.
        this._timer = SC.Timer.schedule({
          target: this,
          action: '_checkForUpdates',
          interval: this.get('interval'),
          repeats: YES
        });
      } else {
        // @if(debug)
        SC.warn('Developer Warning: Attempting to update the application cache should only be done when it is in an IDLE state.  Otherwise, the browser will throw an exception.  The current status is %@.'.fmt(status));
        // @endif
      }
    } else {
      // Stop any previous polling.
      if (this._timer) {
        this._timer.invalidate();
        this._timer = null;
        this._task = null;
      }
    }

    return value;
  }.property().cacheable(),

  /**
    The current window.applicationCache status.

    This is a KVO mapping of window.applicationCache.status.  Possible values
    are:

    * window.applicationCache.UNCACHED
    * window.applicationCache.IDLE
    * window.applicationCache.CHECKING
    * window.applicationCache.DOWNLOADING
    * window.applicationCache.UPDATEREADY
    * window.applicationCache.OBSOLETE

    Because of the various interpretations these statuses can mean, you will
    likely find it easier to use the helper properties on SC.appCache instead.

    @type Number
    @default 0
    */
  status: 0,

  // ------------------------------------------------------------------------
  // Methods
  //

  /** @private */
  _appCacheDidProgress: function (evt) {
    evt = evt.originalEvent;
    if (evt.lengthComputable) {
      this.set('progress', evt.loaded / evt.total);
    } else {
      this.set('progress', null);
    }
  },

  /** @private */
  _appCacheStatusDidChange: function () {
    var appCache = window.applicationCache,
      status;

    status = appCache.status;

    // Clear all previous event listeners.
    SC.Event.remove(appCache);
    switch (status) {
    case appCache.UNCACHED: // UNCACHED == 0
      break;
    case appCache.IDLE: // IDLE == 1
      this.set('progress', 1);
      break;
    case appCache.CHECKING: // CHECKING == 2
      SC.Event.add(appCache, 'downloading', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'noupdate', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'error', this, '_appCacheStatusDidChange');
      break;
    case appCache.DOWNLOADING: // DOWNLOADING == 3
      SC.Event.add(appCache, 'progress', this, '_appCacheDidProgress');
      SC.Event.add(appCache, 'cached', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'updateready', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'error', this, '_appCacheStatusDidChange');
      break;
    case appCache.UPDATEREADY:  // UPDATEREADY == 4
      break;
    case appCache.OBSOLETE: // OBSOLETE == 5
      break;
    default:
      SC.error('Unknown application cache status: %@'.fmt(appCache.status));
      break;
    }

    // Update our status.
    this.set('status', status);
  },

  /** @private Adds a task to check for application updates to the background task queue. */
  _checkForUpdates: function () {
    var task = this._task;

    if (this.get('status') === window.applicationCache.IDLE) {
      if (!task) { task = this._task = SC.AppCacheTask.create(); }
      SC.backgroundTaskQueue.push(task);
    } else {
      // Stop polling if the status isn't IDLE.
      this.set('shouldPoll', false);
    }
  },

  /** @private */
  init: function () {
    sc_super();

    if (SC.platform.supportsApplicationCache) {
      // By the time that this object is created, we may have already passed
      // out of the CHECKING state, but _appCacheStatusDidChange() will take care of it.
      this._appCacheStatusDidChange();
    } else {
      SC.warn('Unable to use SC.appCache, the browser does not support the application cache.');
    }
  }

});
