// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('platform');

/**
  ## Device Motion

  When a device is moved, some platforms will inform us of its movement
  (accelerometer) and angle (gyroscope).

*/
SC.mixin(SC.device,
/** @scope SC.device */ {

  // ..........................................................
  // PROPERTIES
  //

  /*
    TODO [CC] There shouldn't be a need for this property, we should overload
              the addObserver/removeObserver functions and check for the
              rotationX/Y/Z keys.
  */
  /**
    Because the device motion events fire every 50ms, for performance reasons
    you must opt into listening for those events.

    @type Boolean
    @default NO
  */
  listenForDeviceMotion: NO,

  /**
    Amount, in degrees, that the device is rotated around its x axis. x axis is
    the plane of the screen and is positive towards the right hand side of
    the screen, regardless of orientation.

    SC.device#listenForDeviceMotion must be true for this property to update.

    @type Number
    @default 0
  */
  rotationX: 0,

  /**
    Amount, in degrees, that the device is rotated around its y axis (axis runs
    from the top to the bottom of the device). y axis is the plane of the
    screen and is positive towards the top of the screen, regardless of
    orientation.

    SC.device#listenForDeviceMotion must be true for this property to update.

    @type Number
    @default 0
  */
  rotationY: 0,

  /**
    Amount, in degrees, that the device is rotated around its z axis (normal
    coming "out" of the screen). z axis is perpendicular to the screen and is
    positive "out" of (or normal to) the screen. This property is only useful
    if the device has a gyroscope; for devices which lack a gyroscope (use
    an accelerometer or nothing), this property remains 0.

    SC.device#listenForDeviceMotion must be true for this property to update.

    @type Number
    @default 0
  */
  rotationZ: 0,


  // ..........................................................
  // SETUP
  //

  setupMotion: function() {
    SC.RootResponder.responder.listenFor(['devicemotion', 'deviceorientation'], window, this);
  },


  // ..........................................................
  // DEVICE MOTION HANDLING
  //

  _scd_listenForDeviceMotionDidChange: function() {
    if (!SC.RootResponder.responder) return;

    // we only care about the gyro now, we don't need acceleration
    if (this.get('listenForDeviceMotion')) {
      if (SC.platform.hasGyroscope) {
        SC.Event.add(window, 'deviceorientation', this, this._scd_deviceorientationPoll);
      } else if (SC.platform.hasAccelerometer) {
        SC.Event.add(window, 'devicemotion', this, this._scd_devicemotionPoll);
      } else {
        SC.Logger.warn("Can't listen for device motion events on a platform that does not support them");
      }
    } else {
      SC.Event.remove(window, 'deviceorientation', this, this._scd_deviceorientationPoll);
      SC.Event.remove(window, 'devicemotion', this, this._scd_devicemotionPoll);
    }
  },

  /**
    Fired once every 50ms, informing us of the gyroscope measurements
  */
  deviceorientation: function(evt) {
    evt = evt.originalEvent;

    if (!SC.platform.hasGyroscope) SC.platform.hasGyroscope = YES;

    SC.Event.remove(window, 'deviceorientation', this, this.deviceorientation);
    SC.Event.remove(window, 'devicemotion', this, this.devicemotion);

    this.addObserver('listenForDeviceMotion', this, this._scd_listenForDeviceMotionDidChange);
    this.notifyPropertyChange('listenForDeviceMotion');
  },

  /** @private
    Gets called after the first deviceorientation event, used to actually set
    the rotation values
  */
  _scd_deviceorientationPoll: function(evt) {
    var orientation = this.get('orientation');

    evt = evt.originalEvent;

    SC.run(function() {
      this.beginPropertyChanges();
      this.set('rotationX', orientation !== 'landscape' ? evt.beta : evt.gamma);
      this.set('rotationY', orientation !== 'landscape' ? evt.gamma : -evt.beta);
      this.set('rotationZ', evt.alpha);
      this.endPropertyChanges();
    }, this);
  },

  /** @private
    Because we only want to deal with only the gyroscope, if it is firing its event,
    we wait until two devicemotion events have been fired to decide to use the
    accelerometer instead.
  */
  _devicemotionCalled: NO,

  /**
    Fired every 50ms, informing us of the accelerometer measurements
  */
  devicemotion: function(evt) {
    if (!SC.platform.hasAccelerometer) SC.platform.hasAccelerometer = YES;

    if (this._devicemotionCalled) {
      // if this happens, and this event fires (ie. the deviceorientation event hasn't)
      // then we assume the device does not have a gyroscope
      SC.Event.remove(window, 'deviceorientation', this, this.deviceorientation);
      SC.Event.remove(window, 'devicemotion', this, this.devicemotion);

      this.set('rotationZ', 0); // ensure rotationZ does not get any other value
      this.addObserver('listenForDeviceMotion', this, this._scd_listenForDeviceMotionDidChange);
      this.notifyPropertyChange('listenForDeviceMotion');
    } else {
      this._devicemotionCalled = YES;
    }
  },

  /*
    TODO [CC] This needs to be expanded on a bit. If you hold the device in weird
              positions, the rotation values from the accelerometer no longer match those
              from the gyroscope. What about people who use their iPad in bed?!
  */
  /** @private
    Gets called after the first devicemotion event, if the device has no gyropscope.
  */
  _scd_devicemotionPoll: function(evt) {
    var min = SC.platform.accelerationMinimum,
        max = SC.platform.accelerationMaximum,
        spread = max - min,
        orientation = this.get('orientation'),
        aX, aY, rX, rY, swap;

    evt = evt.originalEvent;

    aX = evt.accelerationIncludingGravity.x;
    aY = evt.accelerationIncludingGravity.y;

    if (aX < min) aX = min;
    else if (aX > max) aX = max;
    if (aY < min) aY = min;
    else if (aY > max) aY = max;

    if (orientation === 'landscape') {
      swap = aX;
      aX = aY;
      aY = swap;
    }

    rX = 90 - ((aY-min)/spread) * 180;
    rY = -90 + ((aX-min)/spread) * 180;

    SC.run(function() {
      this.beginPropertyChanges();
      this.set('rotationX', rX);
      this.set('rotationY', rY);
      this.endPropertyChanges();
    }, this);
  }

});

SC.ready(function() {
  SC.device.setupMotion();
});
