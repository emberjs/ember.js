// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime');

var get = Ember.get, set = Ember.set;

// simple copy op needed for just this code.
function copy(opts) {
  var ret = {};
  for(var key in opts) {
    if (opts.hasOwnProperty(key)) ret[key] = opts[key];
  }
  return ret;
}

/**
  Standard error thrown by `Ember.Scanner` when it runs out of bounds

  @static
  @constant
  @type Error
*/
Ember.SCANNER_OUT_OF_BOUNDS_ERROR = "Out of bounds.";

/**
  Standard error thrown by `Ember.Scanner` when  you pass a value not an integer.

  @static
  @constant
  @type Error
*/
Ember.SCANNER_INT_ERROR = "Not an int.";

/**
  Standard error thrown by `Ember.Scanner` when it cannot find a string to skip.

  @static
  @constant
  @type Error
*/
Ember.SCANNER_SKIP_ERROR = "Did not find the string to skip.";

/**
  Standard error thrown by `Ember.Scanner` when it can any kind a string in the
  matching array.

  @static
  @constant
  @type Error
*/
Ember.SCANNER_SCAN_ARRAY_ERROR = "Did not find any string of the given array to scan.";

/**
  Standard error thrown when trying to compare two dates in different
  timezones.

  @static
  @constant
  @type Error
*/
Ember.DATETIME_COMPAREDATE_TIMEZONE_ERROR = "Can't compare the dates of two DateTimes that don't have the same timezone.";

/**
  Standard ISO8601 date format

  @static
  @type String
  @default '%Y-%m-%dT%H:%M:%S%Z'
  @constant
*/
Ember.DATETIME_ISO8601 = '%Y-%m-%dT%H:%M:%S%Z';


/**
  @ignore
  @private

  A Scanner reads a string and interprets the characters into numbers. You
  assign the scanner's string on initialization and the scanner progresses
  through the characters of that string from beginning to end as you request
  items.

  Scanners are used by `DateTime` to convert strings into `DateTime` objects.

  @extends Ember.Object
  @since Ember 0.9
  @author Martin Ottenwaelter
*/
var Scanner = Ember.Object.extend({

  /**
    The string to scan. You usually pass it to the create method:

        Scanner.create({string: 'May, 8th'});

    @type String
  */
  string: null,

  /**
    The current scan location. It is incremented by the scanner as the
    characters are processed.
    The default is 0: the beginning of the string.

    @type Integer
  */
  scanLocation: 0,

  /**
    Reads some characters from the string, and increments the scan location
    accordingly.

    @param {Integer} len The amount of characters to read
    @throws {Ember.SCANNER_OUT_OF_BOUNDS_ERROR} If asked to read too many characters
    @returns {String} The characters
  */
  scan: function(len) {
    if (this.scanLocation + len > this.length) {
      throw new Error(Ember.SCANNER_OUT_OF_BOUNDS_ERROR);
    }
    var str = this.string.substr(this.scanLocation, len);
    this.scanLocation += len;
    return str;
  },

  /**
    Reads some characters from the string and interprets it as an integer.

    @param {Integer} min_len The minimum amount of characters to read
    @param {Integer} [max_len] The maximum amount of characters to read (defaults to the minimum)
    @throws {Ember.SCANNER_INT_ERROR} If asked to read non numeric characters
    @returns {Integer} The scanned integer
  */
  scanInt: function(min_len, max_len) {
    if (max_len === undefined) max_len = min_len;
    var str = this.scan(max_len);
    var re = new RegExp("^\\d{" + min_len + "," + max_len + "}");
    var match = str.match(re);
    if (!match) throw new Error(Ember.SCANNER_INT_ERROR);
    if (match[0].length < max_len) {
      this.scanLocation += match[0].length - max_len;
    }
    return parseInt(match[0], 10);
  },

  /**
    Attempts to skip a given string.

    @param {String} str The string to skip
    @throws {Ember.SCANNER_SKIP_ERROR} If the given string could not be scanned
    @returns {Boolean} YES if the given string was successfully scanned, NO otherwise
  */
  skipString: function(str) {
    if (this.scan(str.length) !== str) {
      throw new Error(Ember.SCANNER_SKIP_ERROR);
    }
    
    return YES;
  },

  /**
    Attempts to scan any string in a given array.

    @param {Array} ary the array of strings to scan
    @throws {Ember.SCANNER_SCAN_ARRAY_ERROR} If no string of the given array is found
    @returns {Integer} The index of the scanned string of the given array
  */
  scanArray: function(ary) {
    for (var i = 0, len = ary.length; i < len; i++) {
      if (this.scan(ary[i].length) === ary[i]) {
        return i;
      }
      this.scanLocation -= ary[i].length;
    }
    throw new Error(Ember.SCANNER_SCAN_ARRAY_ERROR);
  }

});


/** @class

  A class representation of a date and time. It's basically a wrapper around
  the Date javascript object, KVO-friendly and with common date/time
  manipulation methods.

  This object differs from the standard JS Date object, however, in that it
  supports time zones other than UTC and that local to the machine on which
  it is running.  Any time zone can be specified when creating an
  `Ember.DateTime` object, e.g.

      // Creates a DateTime representing 5am in Washington, DC and 10am in 
      // London
      var d = Ember.DateTime.create({ hour: 5, timezone: 300 }); // -5 hours from UTC
      var e = Ember.DateTime.create({ hour: 10, timezone: 0 }); // same time, specified in UTC

  and it is true that `d.isEqual(e)`.

  The time zone specified upon creation is permanent, and any calls to
  `get()` on that instance will return values expressed in that time zone. So,

      d.hour returns 5.
      e.hour returns 10.

  but

      d.milliseconds === e.milliseconds

  is true, since they are technically the same position in time.

  @extends Ember.Object
  @extends Ember.Freezable
  @extends Ember.Copyable
  @author Martin Ottenwaelter
  @author Jonathan Lewis
  @author Josh Holt
  @since Ember 1.0
*/
Ember.DateTime = Ember.Object.extend(Ember.Freezable, Ember.Copyable,
/** @scope Ember.DateTime.prototype */ {

  /**
    @private

    Internal representation of a date: the number of milliseconds
    since January, 1st 1970 00:00:00.0 UTC.

    @property
    @type {Integer}
  */
  _ms: 0,

  /** @read-only
    The offset, in minutes, between UTC and the object's timezone.
    All calls to `get()` will use this time zone to translate date/time
    values into the zone specified here.

    @type Integer
  */
  timezone: 0,

  /**
    A `Ember.DateTime` instance is frozen by default for better performance.

    @type Boolean
  */
  isFrozen: YES,

  /**
    Returns a new `Ember.DateTime` object where one or more of the elements have 
    been changed according to the options parameter. The time options (hour,
    minute, sec, usec) reset cascadingly, so if only the hour is passed, then
    minute, sec, and usec is set to 0. If the hour and minute is passed, then
    sec and usec is set to 0.

    If a time zone is passed in the options hash, all dates and times are 
    assumed to be local to it, and the returned `Ember.DateTime` instance has 
    that time zone. If none is passed, it defaults to `Ember.DateTime.timezone`.

    Note that passing only a time zone does not affect the actual milliseconds 
    since Jan 1, 1970, only the time zone in which it is expressed when 
    displayed.

    @see Ember.DateTime#create for the list of options you can pass
    @returns {Ember.DateTime} copy of receiver
  */
  adjust: function(options, resetCascadingly) {
    var timezone;

    options = options ? copy(options) : {};
    timezone = (options.timezone !== undefined) ? options.timezone : (this.timezone !== undefined) ? this.timezone : 0;

    return this.constructor._adjust(options, this._ms, timezone, resetCascadingly)._createFromCurrentState();
  },

  /**
    Returns a new `Ember.DateTime` object advanced according the the given 
    parameters. Don't use floating point values, it might give unpredicatble results.

    @see Ember.DateTime#create for the list of options you can pass
    @param {Hash} options the amount of date/time to advance the receiver
    @returns {DateTime} copy of the receiver
  */
  advance: function(options) {
    return this.constructor._advance(options, this._ms, this.timezone)._createFromCurrentState();
  },

  /**
    Generic getter.

    The properties you can get are:
      - `year`
      - `month` (January is 1, contrary to JavaScript Dates for which January is 0)
      - `day`
      - `dayOfWeek` (Sunday is 0)
      - `hour`
      - `minute`
      - `second`
      - `millisecond`
      - `milliseconds`, the number of milliseconds since
        January, 1st 1970 00:00:00.0 UTC
      - `isLeapYear`, a boolean value indicating whether the receiver's year
        is a leap year
      - `daysInMonth`, the number of days of the receiver's current month
      - `dayOfYear`, January 1st is 1, December 31th is 365 for a common year
      - `week` or `week1`, the week number of the current year, starting with
        the first Sunday as the first day of the first week (00..53)
      - `week0`, the week number of the current year, starting with
        the first Monday as the first day of the first week (00..53)
      - `lastMonday`, `lastTuesday`, etc., `nextMonday`,
        `nextTuesday`, etc., the date of the last or next weekday in
        comparison to the receiver.

    @param {String} key the property name to get
    @return the value asked for
  */
  unknownProperty: function(key) {
    return this.constructor._get(key, this._ms, this.timezone);
  },

  /**
    Formats the receiver according to the given format string. Should behave
    like the C strftime function.

    The format parameter can contain the following characters:
      - %a -- The abbreviated weekday name (``Sun'')
      - %A -- The full weekday name (``Sunday'')
      - %b -- The abbreviated month name (``Jan'')
      - %B -- The full month name (``January'')
      - %c -- The preferred local date and time representation
      - %d -- Day of the month (01..31)
      - %D -- Day of the month (0..31)
      - %h -- Hour of the day, 24-hour clock (0..23)
      - %H -- Hour of the day, 24-hour clock (00..23)
      - %i -- Hour of the day, 12-hour clock (1..12)
      - %I -- Hour of the day, 12-hour clock (01..12)
      - %j -- Day of the year (001..366)
      - %m -- Month of the year (01..12)
      - %M -- Minute of the hour (00..59)
      - %p -- Meridian indicator (``AM'' or ``PM'')
      - %S -- Second of the minute (00..60)
      - %s -- Milliseconds of the second (000..999)
      - %U -- Week number of the current year,
          starting with the first Sunday as the first
          day of the first week (00..53)
      - %W -- Week number of the current year,
          starting with the first Monday as the first
          day of the first week (00..53)
      - %w -- Day of the week (Sunday is 0, 0..6)
      - %x -- Preferred representation for the date alone, no time
      - %X -- Preferred representation for the time alone, no date
      - %y -- Year without a century (00..99)
      - %Y -- Year with century
      - %Z -- Time zone (ISO 8601 formatted)
      - %% -- Literal ``%'' character

    @param {String} format the format string
    @return {String} the formatted string
  */
  toFormattedString: function(fmt) {
    return this.constructor._toFormattedString(fmt, this._ms, this.timezone);
  },

  /**
    Formats the receiver according ISO 8601 standard. It is equivalent to
    calling toFormattedString with the `'%Y-%m-%dT%H:%M:%S%Z'` format string.

    @return {String} the formatted string
  */
  toISO8601: function(){
    return this.constructor._toFormattedString(Ember.DATETIME_ISO8601, this._ms, this.timezone);
  },

  /**
    @private

    Creates a string representation of the receiver.

    (Debuggers often call the `toString` method. Because of the way
    `Ember.DateTime` is designed, calling `Ember.DateTime._toFormattedString` would
    have a nasty side effect. We shouldn't therefore call any of
    `Ember.DateTime`'s methods from `toString`)

    @returns {String}
  */
  toString: function() {
    return "UTC: " +
           new Date(this._ms).toUTCString() +
           ", timezone: " +
           this.timezone;
  },

  /**
    Returns `YES` if the passed `Ember.DateTime` is equal to the receiver, ie: if their
    number of milliseconds since January, 1st 1970 00:00:00.0 UTC are equal.
    This is the preferred method for testing equality.

    @see Ember.DateTime#compare
    @param {Ember.DateTime} aDateTime the DateTime to compare to
    @returns {Boolean}
  */
  isEqual: function(aDateTime) {
    return this.constructor.compare(this, aDateTime) === 0;
  },

  /**
    Returns a copy of the receiver. Because of the way `Ember.DateTime` is designed,
    it just returns the receiver.

    @returns {Ember.DateTime}
  */
  copy: function() {
    return this;
  },

  /**
    Returns a copy of the receiver with the timezone set to the passed
    timezone. The returned value is equal to the receiver (ie `Ember.Compare`
    returns 0), it is just the timezone representation that changes.

    If you don't pass any argument, the target timezone is assumed to be 0,
    ie UTC.

    Note that this method does not change the underlying position in time,
    but only the time zone in which it is displayed. In other words, the underlying
    number of milliseconds since Jan 1, 1970 does not change.

    @return {Ember.DateTime}
  */
  toTimezone: function(timezone) {
    if (timezone === undefined) timezone = 0;
    return this.advance({ timezone: timezone - this.timezone });
  }

});

Ember.DateTime.reopenClass(Ember.Comparable,
/** @scope Ember.DateTime */ {

  /**
    The default format (ISO 8601) in which DateTimes are stored in a record.
    Change this value if your backend sends and receives dates in another
    format.

    This value can also be customized on a per-attribute basis with the format
    property. For example:

        Ember.Record.attr(Ember.DateTime, { format: '%d/%m/%Y %H:%M:%S' })

    @type String
    @default Ember.DATETIME_ISO8601
  */
  recordFormat: Ember.DATETIME_ISO8601,

  /**
    @type Array
    @default ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  */
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  /**
    @private

    The English day names used for the 'lastMonday', 'nextTuesday', etc., getters.

    @type Array
  */
  _englishDayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  /**
    @type Array
    @default ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  */
  abbreviatedDayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  /**
    @type Array
    @default ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  */
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

  /**
    @type Array
    @default ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  */
  abbreviatedMonthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  /**
    @private

    The unique internal `Date` object used to make computations. Better
    performance is obtained by having only one Date object for the whole
    application and manipulating it with `setTime()` and `getTime()`.

    Note that since this is used for internal calculations across many
    `Ember.DateTime` instances, it is not guaranteed to store the date/time that
    any one `Ember.DateTime` instance represents.  So it might be that

        this._date.getTime() !== this._ms

    Be sure to set it before using for internal calculations if necessary.

    @type Date
  */
  _date: new Date(),

  /**
    @private

    The offset, in minutes, between UTC and the currently manipulated
    `Ember.DateTime` instance.

    @type Integer
  */
  _tz: 0,

  /**
    The offset, in minutes, between UTC and the local system time. This
    property is computed at loading time and should never be changed.

    @type Integer
    @default new Date().getTimezoneOffset()
    @constant
  */
  timezone: new Date().getTimezoneOffset(),

  /**
    @private

    A cache of `Ember.DateTime` instances. If you attempt to create a `Ember.DateTime`
    instance that has already been created, then it will return the cached
    value.

    @type Array
  */
  _dt_cache: {},

  /**
    @private

    The index of the lastest cached value. Used with `_DT_CACHE_MAX_LENGTH` to
    limit the size of the cache.

    @type Integer
  */
  _dt_cache_index: -1,

  /**
    @private

    The maximum length of `_dt_cache`. If this limit is reached, then the cache
    is overwritten, starting with the oldest element.

    @type Integer
  */
  _DT_CACHE_MAX_LENGTH: 1000,

  /**
    @private

    Both args are optional, but will only overwrite `_date` and `_tz` if
    defined. This method does not affect the DateTime instance's actual time,
    but simply initializes the one `_date` instance to a time relevant for a
    calculation. (`this._date` is just a resource optimization)

    This is mainly used as a way to store a recursion starting state during
    internal calculations.

    'milliseconds' is time since Jan 1, 1970.
    'timezone' is the current time zone we want to be working in internally.

    Returns a hash of the previous milliseconds and time zone in case they
    are wanted for later restoration.
  */
  _setCalcState: function(ms, timezone) {
    var previous = {
      milliseconds: this._date.getTime(),
      timezone: this._tz
    };

    if (ms !== undefined) this._date.setTime(ms);
    if (timezone !== undefined) this._tz = timezone;

    return previous;
  },

  /**
    @private

    By this time, any time zone setting on 'hash' will be ignored.
    'timezone' will be used, or the last this._tz.
  */
  _setCalcStateFromHash: function(hash, timezone) {
    var tz = (timezone !== undefined) ? timezone : this._tz; // use the last-known time zone if necessary
    var ms = this._toMilliseconds(hash, this._ms, tz); // convert the hash (local to specified time zone) to milliseconds (in UTC)
    return this._setCalcState(ms, tz); // now call the one we really wanted
  },

  /**
    @private
    @see Ember.DateTime#unknownProperty
  */
  _get: function(key, start, timezone) {
    var ms, tz, doy, m, y, firstDayOfWeek, dayOfWeek, dayOfYear, prefix, suffix;
    var currentWeekday, targetWeekday;
    var d = this._date;
    var originalTime, v = null;

    // Set up an absolute date/time using the given milliseconds since Jan 1, 1970.
    // Only do it if we're given a time value, though, otherwise we want to use the
    // last one we had because this `_get()` method is recursive.
    //
    // Note that because these private time calc methods are recursive, and because all DateTime instances
    // share an internal this._date and `this._tz` state for doing calculations, methods
    // that modify `this._date` or `this._tz` should restore the last state before exiting
    // to avoid obscure calculation bugs.  So we save the original state here, and restore
    // it before returning at the end.
    originalTime = this._setCalcState(start, timezone); // save so we can restore it to how it was before we got here

    // Check this first because it is an absolute value -- no tweaks necessary when calling for milliseconds
    if (key === 'milliseconds') {
      v = d.getTime();
    }
    else if (key === 'timezone') {
      v = this._tz;
    }

    // 'nextWeekday' or 'lastWeekday'.
    // We want to do this calculation in local time, before shifting UTC below.
    if (v === null) {
      prefix = key.slice(0, 4);
      suffix = key.slice(4);
      if (prefix === 'last' || prefix === 'next') {
        currentWeekday = this._get('dayOfWeek', start, timezone);
        targetWeekday = this._englishDayNames.indexOf(suffix);
        if (targetWeekday >= 0) {
          var delta = targetWeekday - currentWeekday;
          if (prefix === 'last' && delta >= 0) delta -= 7;
          if (prefix === 'next' && delta <  0) delta += 7;
          this._advance({ day: delta }, start, timezone);
          v = this._createFromCurrentState();
        }
      }
    }

    if (v === null) {
      // need to adjust for alternate display time zone.
      // Before calculating, we need to get everything into a common time zone to
      // negate the effects of local machine time (so we can use all the 'getUTC...() methods on Date).
      if (timezone !== undefined) {
        this._setCalcState(d.getTime() - (timezone * 60000), 0); // make this instance's time zone the new UTC temporarily
      }

      // simple keys
      switch (key) {
        case 'year':
          v = d.getUTCFullYear(); //TODO: investigate why some libraries do getFullYear().toString() or getFullYear()+""
          break;
        case 'month':
          v = d.getUTCMonth()+1; // January is 0 in JavaScript
          break;
        case 'day':
          v = d.getUTCDate();
          break;
        case 'dayOfWeek':
          v = d.getUTCDay();
          break;
        case 'hour':
          v = d.getUTCHours();
          break;
        case 'minute':
          v = d.getUTCMinutes();
          break;
        case 'second':
          v = d.getUTCSeconds();
          break;
        case 'millisecond':
          v = d.getUTCMilliseconds();
          break;
      }

      // isLeapYear
      if ((v === null) && (key === 'isLeapYear')) {
        y = this._get('year');
        v = (y%4 === 0 && y%100 !== 0) || y%400 === 0;
      }

      // daysInMonth
      if ((v === null) && (key === 'daysInMonth')) {
        switch (this._get('month')) {
          case 4:
          case 6:
          case 9:
          case 11:
            v = 30;
            break;
          case 2:
            v = this._get('isLeapYear') ? 29 : 28;
            break;
          default:
            v = 31;
            break;
        }
      }

      // dayOfYear
      if ((v === null) && (key === 'dayOfYear')) {
        ms = d.getTime(); // save time
        doy = this._get('day');
        this._setCalcStateFromHash({ day: 1 });
        for (m = this._get('month') - 1; m > 0; m--) {
          this._setCalcStateFromHash({ month: m });
          doy += this._get('daysInMonth');
        }
        d.setTime(ms); // restore time
        v = doy;
      }

      // week, week0 or week1
      if ((v === null) && (key.slice(0, 4) === 'week')) {
        // firstDayOfWeek should be 0 (Sunday) or 1 (Monday)
        firstDayOfWeek = key.length === 4 ? 1 : parseInt(key.slice('4'), 10);
        dayOfWeek = this._get('dayOfWeek');
        dayOfYear = this._get('dayOfYear') - 1;
        if (firstDayOfWeek === 0) {
          v = parseInt((dayOfYear - dayOfWeek + 7) / 7, 10);
        }
        else {
          v = parseInt((dayOfYear - (dayOfWeek - 1 + 7) % 7 + 7) / 7, 10);
        }
      }
    }

    // restore the internal calculation state in case someone else was in the
    // middle of a calculation (we might be recursing).
    this._setCalcState(originalTime.milliseconds, originalTime.timezone);

    return v;
  },

  /**
    @private

    Sets the internal calculation state to something specified.
  */
  _adjust: function(options, start, timezone, resetCascadingly) {
    var opts = options ? copy(options) : {};
    var ms = this._toMilliseconds(options, start, timezone, resetCascadingly);
    this._setCalcState(ms, timezone);
    return this; // for chaining
  },

  /**
    @private
    @see Ember.DateTime#advance
  */
  _advance: function(options, start, timezone) {
    var opts = options ? copy(options) : {};
    var tz;

    for (var key in opts) {
      opts[key] += this._get(key, start, timezone);
    }

    // The time zone can be advanced by a delta as well, so try to use the
    // new value if there is one.
    tz = (opts.timezone !== undefined) ? opts.timezone : timezone; // watch out for zero, which is acceptable as a time zone

    return this._adjust(opts, start, tz, NO);
  },

  /*
    @private

    Converts a standard date/time options hash to an integer representing that position
    in time relative to Jan 1, 1970
  */
  _toMilliseconds: function(options, start, timezone, resetCascadingly) {
    var opts = options ? copy(options) : {};
    var d = this._date;
    var previousMilliseconds = d.getTime(); // rather than create a new Date object, we'll reuse the instance we have for calculations, then restore it
    var ms, tz;

    // Initialize our internal for-calculations Date object to our current date/time.
    // Note that this object was created in the local machine time zone, so when we set
    // its params later, it will be assuming these values to be in the same time zone as it is.
    // It's ok for start to be null, in which case we'll just keep whatever we had in 'd' before.
    if (!Ember.none(start)) {
      d.setTime(start); // using milliseconds here specifies an absolute location in time, regardless of time zone, so that's nice
    }

    // We have to get all time expressions, both in 'options' (assume to be in time zone 'timezone')
    // and in 'd', to the same time zone before we can any calculations correctly.  So because the Date object provides
    // a suite of UTC getters and setters, we'll temporarily redefine 'timezone' as our new
    // 'UTC', so we don't have to worry about local machine time.  We do this by subtracting
    // milliseconds for the time zone offset.  Then we'll do all our calculations, then convert
    // it back to real UTC.

    // (Zero time zone is considered a valid value.)
    tz = (timezone !== undefined) ? timezone : (this.timezone !== undefined) ? this.timezone : 0;
    d.setTime(d.getTime() - (tz * 60000)); // redefine 'UTC' to establish a new local absolute so we can use all the 'getUTC...()' Date methods

    // the time options (hour, minute, sec, millisecond)
    // reset cascadingly (see documentation)
    if (resetCascadingly === undefined || resetCascadingly === YES) {
      if ( !Ember.none(opts.hour) && Ember.none(opts.minute)) {
        opts.minute = 0;
      }
      if (!(Ember.none(opts.hour) && Ember.none(opts.minute))
          && Ember.none(opts.second)) {
        opts.second = 0;
      }
      if (!(Ember.none(opts.hour) && Ember.none(opts.minute) && Ember.none(opts.second))
          && Ember.none(opts.millisecond)) {
        opts.millisecond = 0;
      }
    }

    // Get the current values for any not provided in the options hash.
    // Since everything is in 'UTC' now, use the UTC accessors.  We do this because,
    // according to javascript Date spec, you have to set year, month, and day together
    // if you're setting any one of them.  So we'll use the provided Date.UTC() method
    // to get milliseconds, and we need to get any missing values first...
    if (Ember.none(opts.year))        opts.year = d.getUTCFullYear();
    if (Ember.none(opts.month))       opts.month = d.getUTCMonth() + 1; // January is 0 in JavaScript
    if (Ember.none(opts.day))         opts.day = d.getUTCDate();
    if (Ember.none(opts.hour))        opts.hour = d.getUTCHours();
    if (Ember.none(opts.minute))      opts.minute = d.getUTCMinutes();
    if (Ember.none(opts.second))      opts.second = d.getUTCSeconds();
    if (Ember.none(opts.millisecond)) opts.millisecond = d.getUTCMilliseconds();

    // Ask the JS Date to calculate milliseconds for us (still in redefined UTC).  It
    // is best to set them all together because, for example, a day value means different things
    // to the JS Date object depending on which month or year it is.  It can now handle that stuff
    // internally as it's made to do.
    ms = Date.UTC(opts.year, opts.month - 1, opts.day, opts.hour, opts.minute, opts.second, opts.millisecond);

    // Now that we've done all our calculations in a common time zone, add back the offset
    // to move back to real UTC.
    d.setTime(ms + (tz * 60000));
    ms = d.getTime(); // now get the corrected milliseconds value

    // Restore what was there previously before leaving in case someone called this method
    // in the middle of another calculation.
    d.setTime(previousMilliseconds);

    return ms;
  },

  /**
    Returns a new `Ember.DateTime` object advanced according the the given parameters.
    The parameters can be:

     - none, to create a `Ember.DateTime` instance initialized to the current
       date and time in the local timezone,
     - a integer, the number of milliseconds since
       January, 1st 1970 00:00:00.0 UTC
     - a options hash that can contain any of the following properties: year,
       month, day, hour, minute, second, millisecond, timezone

    Note that if you attempt to create a `Ember.DateTime` instance that has already
    been created, then, for performance reasons, a cached value may be
    returned.

    The timezone option is the offset, in minutes, between UTC and local time.
    If you don't pass a timezone option, the date object is created in the
    local timezone. If you want to create a UTC+2 (CEST) date, for example,
    then you should pass a timezone of -120.

    @param options one of the three kind of parameters descibed above
    @returns {Ember.DateTime} the Ember.DateTime instance that corresponds to the
      passed parameters, possibly fetched from cache
  */
  create: function() {
    var arg = arguments.length === 0 ? {} : arguments[0];
    var timezone;

    // if simply milliseconds since Jan 1, 1970 are given, just use those
    if (Ember.typeOf(arg) === 'number') {
      arg = { milliseconds: arg };
    }

    // Default to local machine time zone if none is given
    timezone = (arg.timezone !== undefined) ? arg.timezone : this.timezone;
    if (timezone === undefined) timezone = 0;

    // Desired case: create with milliseconds if we have them.
    // If we don't, convert what we have to milliseconds and recurse.
    if (!Ember.none(arg.milliseconds)) {

      // quick implementation of a FIFO set for the cache
      var key = 'nu' + arg.milliseconds + timezone, cache = this._dt_cache;
      var ret = cache[key];
      if (!ret) {
        var previousKey, idx = this._dt_cache_index;
        ret = cache[key] = this._super({ _ms: arg.milliseconds, timezone: timezone });
        idx = this._dt_cache_index = (idx + 1) % this._DT_CACHE_MAX_LENGTH;
        previousKey = cache[idx];
        if (previousKey !== undefined && cache[previousKey]) delete cache[previousKey];
        cache[idx] = key;
      }
      return ret;
    }
    // otherwise, convert what we have to milliseconds and try again
    else {
      var now = new Date();

      return this.create({ // recursive call with new arguments
        milliseconds: this._toMilliseconds(arg, now.getTime(), timezone, arg.resetCascadingly),
        timezone: timezone
      });
    }
  },

  /**
    @private

    Calls the `create()` method with the current internal `_date` value.

    @return {Ember.DateTime} the Ember.DateTime instance returned by create()
  */
  _createFromCurrentState: function() {
    return this.create({
      milliseconds: this._date.getTime(),
      timezone: this._tz
    });
  },

  /**
    Returns a `Ember.DateTime` object created from a given string parsed with a given
    format. Returns `null` if the parsing fails.

    @see Ember.DateTime#toFormattedString for a description of the format parameter
    @param {String} str the string to parse
    @param {String} fmt the format to parse the string with
    @returns {DateTime} the DateTime corresponding to the string parameter
  */
  parse: function(str, fmt) {
    // Declared as an object not a literal since in some browsers the literal
    // retains state across function calls
    var re = new RegExp('(?:%([aAbBcdDhHiIjmMpsSUWwxXyYZ%])|(.))', "g");
    var d, parts, opts = {}, check = {}, scanner = Scanner.create({string: str});

    if (Ember.none(fmt)) fmt = Ember.DATETIME_ISO8601;

    try {
      while ((parts = re.exec(fmt)) !== null) {
        switch(parts[1]) {
          case 'a': check.dayOfWeek = scanner.scanArray(this.abbreviatedDayNames); break;
          case 'A': check.dayOfWeek = scanner.scanArray(this.dayNames); break;
          case 'b': opts.month = scanner.scanArray(this.abbreviatedMonthNames) + 1; break;
          case 'B': opts.month = scanner.scanArray(this.monthNames) + 1; break;
          case 'c': throw new Error("%c is not implemented");
          case 'd':
          case 'D': opts.day = scanner.scanInt(1, 2); break;
          case 'h':
          case 'H': opts.hour = scanner.scanInt(1, 2); break;
          case 'i':
          case 'I': opts.hour = scanner.scanInt(1, 2); break;
          case 'j': throw new Error("%j is not implemented");
          case 'm': opts.month = scanner.scanInt(1, 2); break;
          case 'M': opts.minute = scanner.scanInt(1, 2); break;
          case 'p': opts.meridian = scanner.scanArray(['AM', 'PM']); break;
          case 'S': opts.second = scanner.scanInt(1, 2); break;
          case 's': opts.millisecond = scanner.scanInt(1, 3); break;
          case 'U': throw new Error("%U is not implemented");
          case 'W': throw new Error("%W is not implemented");
          case 'w': throw new Error("%w is not implemented");
          case 'x': throw new Error("%x is not implemented");
          case 'X': throw new Error("%X is not implemented");
          case 'y': opts.year = scanner.scanInt(2); opts.year += (opts.year > 70 ? 1900 : 2000); break;
          case 'Y': opts.year = scanner.scanInt(4); break;
          case 'Z':
            var modifier = scanner.scan(1);
            if (modifier === 'Z') {
              opts.timezone = 0;
            } else if (modifier === '+' || modifier === '-' ) {
              var h = scanner.scanInt(2);
              if (scanner.scan(1) !== ':') scanner.scan(-1);
              var m = scanner.scanInt(2);
              opts.timezone = (modifier === '+' ? -1 : 1) * (h*60 + m);
            }
            break;
          case '%': scanner.skipString('%'); break;
          default:  scanner.skipString(parts[0]); break;
        }
      }
    } catch (e) {
      Ember.Logger.log('Ember.DateTime.createFromString ' + e.toString());
      return null;
    }

    if (!Ember.none(opts.meridian) && !Ember.none(opts.hour)) {
      if (opts.meridian === 1) opts.hour = (opts.hour + 12) % 24;
      delete opts.meridian;
    }

   if (!Ember.none(opts.day) && (opts.day < 1 || opts.day > 31)){
     return null;
   }

   // Check the month and day are valid and within bounds
   if (!Ember.none(opts.month)){
     if (opts.month < 1 || opts.month > 12){
       return null;
     }
     if (!Ember.none(opts.day)){
       if ( opts.month === 2 && opts.day > 29 ){
         return null;
       }
       if (jQuery.inArray(opts.month, [4,6,9,11]) > -1 && opts.day > 30) {
         return null;
       }
     }
   }

    d = this.create(opts);

    if (!Ember.none(check.dayOfWeek) && get(d,'dayOfWeek') !== check.dayOfWeek) {
      return null;
    }

    return d;
  },

  /**
    @private

    Converts the x parameter into a string padded with 0s so that the string’s
    length is at least equal to the len parameter.

    @param {Object} x the object to convert to a string
    @param {Integer} the minimum length of the returned string
    @returns {String} the padded string
  */
  _pad: function(x, len) {
    var str = '' + x;
    if (len === undefined) len = 2;
    while (str.length < len) str = '0' + str;
    return str;
  },

  /**
    @private
    @see Ember.DateTime#_toFormattedString
  */
  __toFormattedString: function(part, start, timezone) {
    var hour, offset;

    // Note: all calls to _get() here should include only one
    // argument, since _get() is built for recursion and behaves differently
    // if arguments 2 and 3 are included.
    //
    // This method is simply a helper for this._toFormattedString() (one underscore);
    // this is only called from there, and _toFormattedString() has already
    // set up the appropriate internal date/time/timezone state for it.

    switch(part[1]) {
      case 'a': return this.abbreviatedDayNames[this._get('dayOfWeek')];
      case 'A': return this.dayNames[this._get('dayOfWeek')];
      case 'b': return this.abbreviatedMonthNames[this._get('month')-1];
      case 'B': return this.monthNames[this._get('month')-1];
      case 'c': return this._date.toString();
      case 'd': return this._pad(this._get('day'));
      case 'D': return this._get('day');
      case 'h': return this._get('hour');
      case 'H': return this._pad(this._get('hour'));
      case 'i':
        hour = this._get('hour');
        return (hour === 12 || hour === 0) ? 12 : (hour + 12) % 12;
      case 'I':
        hour = this._get('hour');
        return this._pad((hour === 12 || hour === 0) ? 12 : (hour + 12) % 12);
      case 'j': return this._pad(this._get('dayOfYear'), 3);
      case 'm': return this._pad(this._get('month'));
      case 'M': return this._pad(this._get('minute'));
      case 'p': return this._get('hour') > 11 ? 'PM' : 'AM';
      case 'S': return this._pad(this._get('second'));
      case 's': return this._pad(this._get('millisecond'), 3);
      case 'u': return this._pad(this._get('utc')); //utc
      case 'U': return this._pad(this._get('week0'));
      case 'W': return this._pad(this._get('week1'));
      case 'w': return this._get('dayOfWeek');
      case 'x': return this._date.toDateString();
      case 'X': return this._date.toTimeString();
      case 'y': return this._pad(this._get('year') % 100);
      case 'Y': return this._get('year');
      case 'Z':
        offset = -1 * timezone;
        return (offset >= 0 ? '+' : '-')
               + this._pad(parseInt(Math.abs(offset)/60, 10))
               + ':'
               + this._pad(Math.abs(offset)%60);
      case '%': return '%';
    }
  },

  /**
    @private
    @see Ember.DateTime#toFormattedString
  */
  _toFormattedString: function(format, start, timezone) {
    var that = this;
    var tz = (timezone !== undefined) ? timezone : (this.timezone !== undefined) ? this.timezone : 0;

    // need to move into local time zone for these calculations
    this._setCalcState(start - (timezone * 60000), 0); // so simulate a shifted 'UTC' time

    return format.replace(/\%([aAbBcdDhHiIjmMpsSUWwxXyYZ\%])/g, function() {
      var v = that.__toFormattedString.call(that, arguments, start, timezone);
      return v;
    });
  },

  /**
    This will tell you which of the two passed `DateTime` is greater by
    comparing their number of milliseconds since
    January, 1st 1970 00:00:00.0 UTC.

    @param {Ember.DateTime} a the first DateTime instance
    @param {Ember.DateTime} b the second DateTime instance
    @returns {Integer} -1 if a < b,
                       +1 if a > b,
                       0 if a == b
  */
  compare: function(a, b) {
    var ma = get(a, 'milliseconds');
    var mb = get(b, 'milliseconds');
    return ma < mb ? -1 : ma === mb ? 0 : 1;
  },

  /**
    This will tell you which of the two passed DateTime is greater
    by only comparing the date parts of the passed objects. Only dates
    with the same timezone can be compared.

    @param {Ember.DateTime} a the first DateTime instance
    @param {Ember.DateTime} b the second DateTime instance
    @returns {Integer} -1 if a < b,
                       +1 if a > b,
                       0 if a == b
    @throws {Ember.DATETIME_COMPAREDATE_TIMEZONE_ERROR} if the passed arguments
      don't have the same timezone
  */
  compareDate: function(a, b) {
    if (get(a, 'timezone') !== get(b,'timezone')) {
      throw new Error(Ember.DATETIME_COMPAREDATE_TIMEZONE_ERROR);
    }
    
    var ma = get(a.adjust({hour: 0}), 'milliseconds');
    var mb = get(b.adjust({hour: 0}), 'milliseconds');
    return ma < mb ? -1 : ma === mb ? 0 : 1;
  }

});

/**
  Adds a transform to format the DateTime value to a String value according
  to the passed format string.

      valueBinding: Ember.Binding.dateTime('%Y-%m-%d %H:%M:%S')
                              .from('MyApp.myController.myDateTime');

  @param {String} format format string
  @returns {Ember.Binding} this
*/
Ember.Binding.dateTime = function(format) {
  return this.transform(function(value, binding) {
    return value ? value.toFormattedString(format) : null;
  });
};

