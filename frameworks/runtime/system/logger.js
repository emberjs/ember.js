// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('ext/function');

// ..........................................................
// CONSTANTS
//

// Implementation note:  We use two spaces after four-letter prefixes and one
// after five-letter prefixes so things align in monospaced consoles.

/**
  If {@link SC.Logger.format} is true, this delimiter will be put between arguments.

  @type String
*/
SC.LOGGER_LOG_DELIMITER = ", ";

/**
  If {@link SC.Logger.error} falls back onto {@link SC.Logger.log}, this will be
  prepended to the output.

  @type String
*/
SC.LOGGER_LOG_ERROR = "ERROR: ";

/**
  If {@link SC.Logger.info} falls back onto {@link SC.Logger.log}, this will be
  prepended to the output.

  @type String
*/
SC.LOGGER_LOG_INFO = "INFO:  ";

/**
  If {@link SC.Logger.warn} falls back onto {@link SC.Logger.log}, this will be
  prepended to the output.

  @type String
*/
SC.LOGGER_LOG_WARN = "WARN:  ";

/**
  If {@link SC.Logger.debug} falls back onto {@link SC.Logger.log}, this will be
  prepended to the output.

  @type String
*/
SC.LOGGER_LOG_DEBUG = "DEBUG: ";

/**
  If {@link SC.Logger.group} falls back onto {@link SC.Logger.log}, this will
  be prepended to the output.

  @type String
*/
SC.LOGGER_LOG_GROUP_HEADER = "** %@";       // The variable is the group title

/**
  If the reporter does not support group(), then we’ll add our own indentation
  to our output.  This constant represents one level of indentation.

  @type String
*/
SC.LOGGER_LOG_GROUP_INDENTATION = "    ";

/**
  When reporting recorded log messages, the timestamp is included with this
  prefix.

  @type String
*/
SC.LOGGER_RECORDED_LOG_TIMESTAMP_PREFIX = "%@:  ";


SC.LOGGER_LEVEL_DEBUG = 'debug';
SC.LOGGER_LEVEL_INFO  = 'info';
SC.LOGGER_LEVEL_WARN  = 'warn';
SC.LOGGER_LEVEL_ERROR = 'error';
SC.LOGGER_LEVEL_NONE  = 'none';



/** @class

  Object to allow for safe logging actions, such as using the browser console.
  In addition to being output to the console, logs can be optionally recorded
  in memory, to be accessed by your application as appropriate.

  This class also adds in the concept of a “current log level”, which allows
  your application to potentially determine a subset of logging messages to
  output and/or record.  The order of levels is:

    -  debug        SC.LOGGER_LEVEL_DEBUG
    -  info         SC.LOGGER_LEVEL_INFO
    -  warn         SC.LOGGER_LEVEL_WARN
    -  error        SC.LOGGER_LEVEL_ERROR

  All messages at the level or “above” will be output/recorded.  So, for
  example, if you set the level to 'info', all 'info', 'warn', and 'error'
  messages will be output/recorded, but no 'debug' messages will be.  Also,
  there are two separate log levels:  one for output, and one for recording.
  You may wish to only output, say, 'warn' and above, but record everything
  from 'debug' on up.  (You can also limit the number log messages to record.)

  This mechanism allows your application to avoid needless output (which has a
  non-zero cost in many browsers) in the general case, but turning up the log
  level when necessary for debugging.  Note that there can still be a
  performance cost for preparing log messages (calling {@link String.fmt},
  etc.), so it’s still a good idea to be selective about what log messages are
  output even to 'debug', especially in hot code.

  Similarly, you should be aware that if you wish to log objects without
  stringification — using the {@link SC.Logger.debugWithoutFmt} variants — and
  you enable recording, the “recorded messages” array will hold onto a
  reference to the arguments, potentially increasing the amount of memory
  used.

  As a convenience, this class also adds some shorthand methods to SC:

    -  SC.debug()   ==>   SC.Logger.debug()
    -  SC.info()    ==>   SC.Logger.info()
    -  SC.warn()    ==>   SC.Logger.warn()
    -  SC.error()   ==>   SC.Logger.error()

  …although note that no shorthand versions exist for the less-common
  functions, such as defining groups.

  The FireFox plugin Firebug was used as a function reference. Please see
  [Firebug Logging Reference](http://getfirebug.com/logging.html)
  for further information.

  @author Colin Campbell
  @author Benedikt Böhm
  @author William Kakes
  @extends SC.Object
  @since SproutCore 1.0
  @see <a href="http://getfirebug.com/logging.html">Firebug Logging Reference</a>
*/
SC.Logger = SC.Object.create(
	/** @scope SC.Logger.prototype */{

  // ..........................................................
  // PROPERTIES
  //

  /**
    An optional prefix that will be prepended to all log messages, but not any
    group titles.

    @type String
  */
  messagePrefix: null,


  /**
    An optional prefix that will be prepended to all log messages that are
    output to the browser console, but not those that are recorded.  If you
    specify both this and a 'messagePrefix', both will be output, and only the
    'messagePrefix' will be recorded.

    @type String
  */
  outputMessagePrefix: null,


  /**
    An optional prefix that will be prepended to all log messages that are
    recorded, but not those that are output to the browser console.  If you
    specify both this and a 'messagePrefix', both will be recorded, and only the
    'messagePrefix' will be output to the browser console.

    @type String
  */
  recordedMessagePrefix: null,


  /**
    The current log level determining what is output to the reporter object
    (usually your browser’s console).  Valid values are:

      -  SC.LOGGER_LEVEL_DEBUG
      -  SC.LOGGER_LEVEL_INFO
      -  SC.LOGGER_LEVEL_WARN
      -  SC.LOGGER_LEVEL_ERROR
      -  SC.LOGGER_LEVEL_NONE

    If you do not specify this value, it will default to SC.LOGGER_LEVEL_DEBUG
    when running in development mode and SC.LOGGER_LEVEL_INFO when running in
    production mode.

    @property: {Constant}
  */
  logOutputLevel: null,        // If null, set appropriately during init()


  /**
    The current log level determining what is recorded to the
    'recordedLogMessages' buffer.  Valid values are the same as with
    'logOutputLevel':

      -  SC.LOGGER_LEVEL_DEBUG
      -  SC.LOGGER_LEVEL_INFO
      -  SC.LOGGER_LEVEL_WARN
      -  SC.LOGGER_LEVEL_ERROR
      -  SC.LOGGER_LEVEL_NONE

    If you do not specify this value, it will default to SC.LOGGER_LEVEL_NONE.

    @type Constant
  */
  logRecordingLevel: SC.LOGGER_LEVEL_NONE,


  /**
    All recorded log messages.  You generally should not need to interact with
    this array, as most commonly-used functionality can be achieved via the
    {@link SC.Logger.outputRecordedLogMessages} and
    {@link SC.Logger.stringifyRecordedLogMessages} methods.

    This array will be lazily created when the first message is recorded.

    Format:

    For efficiency, each entry in the array is a simple hash rather than a
    full SC.Object instance.  Furthermore, to minimize memory usage, niceties
    like “type of entry: message” are avoided; if you need to parse this
    structure, you can determine which type of entry you’re looking at by
    checking for the 'message' and 'indentation' fields.
<pre>
    Log entry:
    {
      type:               {Constant}     (SC.LOGGER_LEVEL_DEBUG, etc.)
      message:            {String | Boolean}
      originalArguments:  {Arguments}    // optional
      timestamp:          {Date}
    }

    Group entry (either beginning or end of):
    {
      type:         {Constant}     SC.LOGGER_LEVEL_DEBUG, etc.
      indentation:  {Number}       The value is the new group indentation level
      beginGroup:   {Boolean}      Whether this entry is the beginning of a new group (as opposed to the end)
      title:        {String}       Optional for new groups, and never present for end-of-group
      timestamp:    {Date}
    }
</pre>

    @type Array
  */
  recordedLogMessages: null,


  /**
    If the recording level is set such that messages will be recorded, this is
    the maximum number of messages that will be saved in the
    'recordedLogMessages' array.  Any further recorded messages will push
    older messages out of the array, so the most recent messages will be
    saved.

    @type Number
  */
  recordedLogMessagesMaximumLength: 500,


  /**
    If the recording level is set such that messages will be recorded, this is
    the minimum number of messages that will be saved whenever the recordings
    are pruned.  (They are pruned whenever you hit the maximum length, as
    specified via the 'recordedLogMessagesMaximumLength' property.  This
    mechanism avoids thrashing the array for each log message once the
    maximum is reached.)  When pruning, the most recent messages will be saved.

    @type Number
  */
  recordedLogMessagesPruningMinimumLength: 100,


  /**
    Whether or not to enable debug logging.  This property exists for
    backwards compatibility with previous versions of SC.Logger.  In newer
    code, you should instead set the appropriate output/recording log levels.

    If this property is set to YES, it will set 'logOutputLevel' to
    SC.LOGGER_LEVEL_DEBUG.  Otherwise, it will have no effect.

    @deprecated Set the log level instead.
    @property: {Boolean}
  */
  debugEnabled: NO,


  /**
    Computed property that checks for the existence of the reporter object.

    @type Boolean
  */
  exists: function() {
    return !SC.none(this.get('reporter'));
  }.property('reporter').cacheable(),


  /**
    If console.log does not exist, SC.Logger will use window.alert instead
    when {@link SC.Logger.log} is invoked.

    Note that this property has no effect for messages initiated via the
    debug/info/warn/error methods, on the assumption that it is better to
    simply utilize the message recording mechanism than put up a bunch of
    alerts when there is no browser console.

    @type Boolean
  */
  fallBackOnAlert: NO,


  /**
    The reporter is the object which implements the actual logging functions.

    @default The browser’s console
    @type Object
  */
  reporter: console,




  // ..........................................................
  // METHODS
  //

  /**
    Logs a debug message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    The first argument must be a string, and if there are any additional
    arguments, it is assumed to be a format string.  Thus, you can (and
    should) use it like:

        SC.Logger.debug("%@:  My debug message", this);       // good

    …and not:

        SC.Logger.debug("%@:  My debug message".fmt(this));        // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the debug() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}              A message or a format string
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string
  */
  debug: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.debug() shorthand
    // variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleMessage(SC.LOGGER_LEVEL_DEBUG, YES, message, arguments);
  },


  /**
    Logs a debug message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    Unlike simply debug(), this method does not try to apply String.fmt() to
    the arguments, and instead passes them directly to the reporter (and
    stringifies them if recording).  This can be useful if the browser formats
    a type in a manner more useful to you than you can achieve with
    String.fmt().

    @param {String|Array|Function|Object}
  */
  debugWithoutFmt: function() {
    this._handleMessage(SC.LOGGER_LEVEL_DEBUG, NO, null, arguments);
  },


  /**
    Begins a new group in the console and/or in the recorded array provided
    the respective log levels are set to output/record 'debug' messages.
    Every message after this call (at any log level) will be indented for
    readability until a matching {@link SC.Logger.debugGroupEnd} is invoked,
    and you can create as many levels as you want.

    Assuming you are using 'debug' messages elsewhere, it is preferable to
    group them using this method over simply {@link SC.Logger.group} — the log
    levels could be set such that the 'debug' messages are never seen, and you
    wouldn’t want an empty/needless group!

    You can optionally provide a title for the group.  If there are any
    additional arguments, the first argument is assumed to be a format string.
    Thus, you can (and should) use it like:

          SC.Logger.debugGroup("%@:  My debug group", this);       // good

    …and not:

          SC.Logger.debugGroup("%@:  My debug group".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the debug() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}  (optional)  A title or format string to display above the group
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string as the title
  */
  debugGroup: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.debugGroup()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroup(SC.LOGGER_LEVEL_DEBUG, message, arguments);
  },


  /**
    Ends a group initiated with {@link SC.Logger.debugGroup}, provided the
    respective output/recording log levels are set appropriately.

    @see SC.Logger.debugGroup
  */
  debugGroupEnd: function() {
    // Implementation note:  To avoid having to put the SC.debugGroupEnd()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_DEBUG);
  },



  /**
    Logs an informational message to the console and potentially to the
    recorded array, provided the respective log levels are set appropriately.

    The first argument must be a string, and if there are any additional
    arguments, it is assumed to be a format string.  Thus, you can (and
    should) use it like:

          SC.Logger.info("%@:  My info message", this);       // good

    …and not:

          SC.Logger.info("%@:  My info message".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the info() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}              A message or a format string
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string
  */
  info: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.info() shorthand
    // variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleMessage(SC.LOGGER_LEVEL_INFO, YES, message, arguments);
  },


  /**
    Logs an information message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    Unlike simply info(), this method does not try to apply String.fmt() to
    the arguments, and instead passes them directly to the reporter (and
    stringifies them if recording).  This can be useful if the browser formats
    a type in a manner more useful to you than you can achieve with
    String.fmt().

    @param {String|Array|Function|Object}
  */
  infoWithoutFmt: function() {
    this._handleMessage(SC.LOGGER_LEVEL_INFO, NO, null, arguments);
  },


  /**
    Begins a new group in the console and/or in the recorded array provided
    the respective log levels are set to output/record 'info' messages.
    Every message after this call (at any log level) will be indented for
    readability until a matching {@link SC.Logger.infoGroupEnd} is invoked,
    and you can create as many levels as you want.

    Assuming you are using 'info' messages elsewhere, it is preferable to
    group them using this method over simply {@link SC.Logger.group} — the log
    levels could be set such that the 'info' messages are never seen, and you
    wouldn’t want an empty/needless group!

    You can optionally provide a title for the group.  If there are any
    additional arguments, the first argument is assumed to be a format string.
    Thus, you can (and should) use it like:

          SC.Logger.infoGroup("%@:  My info group", this);       // good

    …and not:

          SC.Logger.infoGroup("%@:  My info group".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the info() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}  (optional)  A title or format string to display above the group
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string as the title
  */
  infoGroup: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.infoGroup()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroup(SC.LOGGER_LEVEL_INFO, message, arguments);
  },


  /**
    Ends a group initiated with {@link SC.Logger.infoGroup}, provided the
    respective output/recording log levels are set appropriately.

    @see SC.Logger.infoGroup
  */
  infoGroupEnd: function() {
    // Implementation note:  To avoid having to put the SC.infoGroupEnd()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_INFO);
  },



  /**
    Logs a warning message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    The first argument must be a string, and if there are any additional
    arguments, it is assumed to be a format string.  Thus, you can (and
    should) use it like:

          SC.Logger.warn("%@:  My warning message", this);       // good

    …and not:

          SC.Logger.warn("%@:  My warning message".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the warn() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}              A message or a format string
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string
  */
  warn: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.warn() shorthand
    // variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleMessage(SC.LOGGER_LEVEL_WARN, YES, message, arguments);

  },


  /**
    Logs a warning message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    Unlike simply warn(), this method does not try to apply String.fmt() to
    the arguments, and instead passes them directly to the reporter (and
    stringifies them if recording).  This can be useful if the browser formats
    a type in a manner more useful to you than you can achieve with
    String.fmt().

    @param {String|Array|Function|Object}
  */
  warnWithoutFmt: function() {
    this._handleMessage(SC.LOGGER_LEVEL_WARN, NO, null, arguments);
  },


  /**
    Begins a new group in the console and/or in the recorded array provided
    the respective log levels are set to output/record 'warn' messages.
    Every message after this call (at any log level) will be indented for
    readability until a matching {@link SC.Logger.warnGroupEnd} is invoked,
    and you can create as many levels as you want.

    Assuming you are using 'warn' messages elsewhere, it is preferable to
    group them using this method over simply {@link SC.Logger.group} — the log
    levels could be set such that the 'warn' messages are never seen, and you
    wouldn’t want an empty/needless group!

    You can optionally provide a title for the group.  If there are any
    additional arguments, the first argument is assumed to be a format string.
    Thus, you can (and should) use it like:

          SC.Logger.warnGroup("%@:  My warn group", this);       // good

    …and not:

          SC.Logger.warnGroup("%@:  My warn group".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the warn() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}  (optional)  A title or format string to display above the group
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string as the title
  */
  warnGroup: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.warnGroup()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroup(SC.LOGGER_LEVEL_WARN, message, arguments);
  },


  /**
    Ends a group initiated with {@link SC.Logger.warnGroup}, provided the
    respective output/recording log levels are set appropriately.

    @see SC.Logger.warnGroup
  */
  warnGroupEnd: function() {
    // Implementation note:  To avoid having to put the SC.warnGroupEnd()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_WARN);
  },


  /**
    Logs an error message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    The first argument must be a string, and if there are any additional
    arguments, it is assumed to be a format string.  Thus, you can (and
    should) use it like:

          SC.Logger.error("%@:  My error message", this);       // good

    …and not:

          SC.Logger.warn("%@:  My error message".fmt(this));    // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the warn() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}              A message or a format string
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string
  */
  error: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.error() shorthand
    // variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleMessage(SC.LOGGER_LEVEL_ERROR, YES, message, arguments);
  },


  /**
    Logs an error message to the console and potentially to the recorded
    array, provided the respective log levels are set appropriately.

    Unlike simply error(), this method does not try to apply String.fmt() to
    the arguments, and instead passes them directly to the reporter (and
    stringifies them if recording).  This can be useful if the browser formats
    a type in a manner more useful to you than you can achieve with
    String.fmt().

    @param {String|Array|Function|Object}
  */
  errorWithoutFmt: function() {
    this._handleMessage(SC.LOGGER_LEVEL_ERROR, NO, null, arguments);
  },


  /**
    Begins a new group in the console and/or in the recorded array provided
    the respective log levels are set to output/record 'error' messages.
    Every message after this call (at any log level) will be indented for
    readability until a matching {@link SC.Logger.errorGroupEnd} is invoked,
    and you can create as many levels as you want.

    Assuming you are using 'error' messages elsewhere, it is preferable to
    group them using this method over simply {@link SC.Logger.group} — the log
    levels could be set such that the 'error' messages are never seen, and you
    wouldn’t want an empty/needless group!

    You can optionally provide a title for the group.  If there are any
    additional arguments, the first argument is assumed to be a format string.
    Thus, you can (and should) use it like:

          SC.Logger.errorGroup("%@:  My error group", this);       // good

    …and not:

          SC.Logger.errorGroup("%@:  My error group".fmt(this));   // bad

    The former method can be more efficient because if the log levels are set
    in such a way that the error() invocation will be ignored, then the
    String.fmt() call will never actually be performed.

    @param {String}  (optional)  A title or format string to display above the group
    @param {…}       (optional)  Other arguments to pass to String.fmt() when using a format string as the title
  */
  errorGroup: function(message, optionalFormatArgs) {
    // Implementation note:  To avoid having to put the SC.errorGroup()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroup(SC.LOGGER_LEVEL_ERROR, message, arguments);
  },


  /**
    Ends a group initiated with {@link SC.Logger.errorGroup}, provided the
    respective output/recording log levels are set appropriately.

    @see SC.Logger.errorGroup
  */
  errorGroupEnd: function() {
    // Implementation note:  To avoid having to put the SC.errorGroupEnd()
    // shorthand variant inside a function wrapper, we'll avoid 'this'.
    SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_ERROR);
  },



  /**
    This method will output all recorded log messages to the reporter.  This
    provides a convenient way to see the messages “on-demand” without having
    to have them always output.  The timestamp of each message will be
    included as a prefix if you specify 'includeTimestamps' as YES, although
    in some browsers the native group indenting can make the timestamp
    formatting less than ideal.

    @param {Boolean}  (optional)  Whether to include timestamps in the output
  */
  outputRecordedLogMessages: function(includeTimestamps) {
    // If we have no reporter, there's nothing we can do.
    if (!this.get('exists')) return;

    var reporter        = this.get('reporter'),
        entries         = this.get('recordedLogMessages'),
        indentation     = 0,
        timestampFormat = SC.LOGGER_RECORDED_LOG_TIMESTAMP_PREFIX,
        i, iLen, entry, type, timestampStr, message, originalArguments,
        output, title, newIndentation, disparity, j, jLen;

    if (entries) {
      for (i = 0, iLen = entries.length;  i < iLen;  ++i) {
        entry        = entries[i];
        type         = entry.type;

        if (includeTimestamps) {
          timestampStr = timestampFormat.fmt(entry.timestamp.toUTCString());
        }

        // Is this a message or a group directive?
        message = entry.message;
        if (message) {
          // It's a message entry.  Were the original arguments stored?  If
          // so, we need to use those instead of the message.
          originalArguments = entry.originalArguments;
          this._outputMessage(type, timestampStr, indentation, message, originalArguments);
        }
        else {
          // It's a group directive.  Update our indentation appropriately.
          newIndentation = entry.indentation;
          title          = entry.title;
          disparity      = newIndentation - indentation;

          // If the reporter implements group() and the indentation level
          // changes by more than 1, that implies that some earlier “begin
          // group” / “end group” directives were pruned from the beginning of
          // the buffer and we need to insert empty groups to compensate.
          if (reporter.group) {
            if (Math.abs(disparity) > 1) {
              for (j = 0, jLen = (disparity - 1);  j < jLen;  ++j) {
                if (disparity > 0) {
                  reporter.group();
                }
                else {
                  reporter.groupEnd();
                }
              }
            }

            if (disparity > 0) {
              output = timestampStr ? timestampStr : "";
              output += title;
              reporter.group(output);
            }
            else {
              reporter.groupEnd();
            }
          }
          else {
            // The reporter doesn't implement group()?  Then simulate it using
            // log(), assuming it implements that.
            if (disparity > 0) {
              // We're beginning a group.  Output the header at an indentation
              // that is one smaller.
              this._outputGroup(type, timestampStr, newIndentation - 1, title);
            }
            // else {}  (There is no need to simulate a group ending.)
          }

          // Update our indentation.
          indentation = newIndentation;
        }
      }
    }
  },


  /**
    This method will return a string representation of all recorded log
    messages to the reporter, which can be convenient for saving logs and so
    forth.  The timestamp of each message will be included in the string.

    If there are no recorded log messages, an empty string will be returned
    (as opposed to null).

    @returns {String}
  */
  stringifyRecordedLogMessages: function() {
    var ret           = "",
        entries       = this.get('recordedLogMessages'),
        indentation   = 0,
        timestampFormat = SC.LOGGER_RECORDED_LOG_TIMESTAMP_PREFIX,
        prefixMapping = this._LOG_FALLBACK_PREFIX_MAPPING,
        groupHeader   = SC.LOGGER_LOG_GROUP_HEADER,
        i, iLen, entry, type, message, originalArguments, prefix, line,
        title, newIndentation, disparity;

    if (entries) {
      for (i = 0, iLen = entries.length;  i < iLen;  ++i) {
        entry = entries[i];
        type  = entry.type;

        // First determine the prefix.
        prefix = timestampFormat.fmt(entry.timestamp.toUTCString());
        prefix += prefixMapping[type] || "";

        // Is this a message or a group directive?
        message = entry.message;
        if (message) {
          // It's a message entry.  Were arguments used, or did we format a
          // message?  If arguments were used, we need to stringify those
          // instead of using the message.
          originalArguments = entry.originalArguments;
          line =  prefix + this._indentation(indentation);
          line += originalArguments ? this._argumentsToString(originalArguments) : message;
        }
        else {
          // It's a group directive, so we need to update our indentation
          // appropriately.  Also, if it's the beginning of the group and it
          // has a title, then we need to include an appropriate header.
          newIndentation = entry.indentation;
          title          = entry.title;
          disparity      = newIndentation - indentation;
          if (disparity > 0) {
            // We're beginning a group.  Output the header at an indentation
            // that is one smaller.
            line = prefix + this._indentation(indentation) + groupHeader.fmt(title);
          }

          // Update our indentation.
          indentation = newIndentation;
        }

        // Add the line to our string.
        ret += line + "\n";
      }
    }
    return ret;
  },



  /**
    Log output to the console, but only if it exists.

    IMPORTANT:  Unlike debug(), info(), warn(), and error(), messages sent to
    this method do not consult the log level and will always be output.
    Similarly, they will never be recorded.

    In general, you should avoid this method and instead choose the
    appropriate categorization for your message, choosing the appropriate
    method.

    @param {String|Array|Function|Object}
    @returns {Boolean} Whether or not anything was logged
  */
  log: function() {
    var reporter     = this.get('reporter'),
        message      = arguments[0],
        prefix       = this.get('messagePrefix'),
        outputPrefix = this.get('outputMessagePrefix'),
        ret          = NO;

    // If the first argument is a string and a prefix was specified, use it.
    if (message  &&  SC.typeOf(message) === SC.T_STRING) {
      if (prefix  ||  outputPrefix) {
        if (prefix)       message = prefix       + message;
        if (outputPrefix) message = outputPrefix + message;
        arguments[0] = message;
      }
    }

    // Log through the reporter.
    if (this.get('exists')) {
      if (typeof reporter.log === "function") {
        reporter.log.apply(reporter, arguments);
        ret = YES;
      }
      else if (reporter.log) {
        // IE8 implements console.log but reports the type of console.log as
        // "object", so we cannot use apply().  Because of this, the best we
        // can do is call it directly with an array of our arguments.
        reporter.log(this._argumentsToArray(arguments));
        ret = YES;
      }
    }

    // log through alert
    if (!ret  &&  this.get('fallBackOnAlert')) {
      // include support for overriding the alert through the reporter
      // if it has come this far, it's likely this will fail
      if (this.get('exists')  &&  (typeof reporter.alert === "function")) {
        reporter.alert(arguments);
        ret = YES;
      }
      else {
        alert(arguments);
        ret = YES;
      }
    }
    return ret;
  },


  /**
    Every log after this call until {@link SC.Logger.groupEnd} is called
    will be indented for readability.  You can create as many levels
    as you want.

    IMPORTANT:  Unlike debugGroup(), infoGroup(), warnGroup(), and
    errorGroup(), this method do not consult the log level and will always
    result in output when the reporter supports it.  Similarly, group messages
    logged via this method will never be recorded.

    @param {String}  (optional)  An optional title to display above the group
  */
  group: function(title) {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.group === "function")) {
      reporter.group(title);
    }
  },

  /**
    Ends a group declared with {@link SC.Logger.group}.

    @see SC.Logger.group
  */
  groupEnd: function() {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.groupEnd === "function")) {
      reporter.groupEnd();
    }
  },



  /**
    Outputs the properties of an object.

    Logs the object using {@link SC.Logger.log} if the reporter.dir function
    does not exist.

    @param {Object}
  */
  dir: function() {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.dir === "function")) {
      // Firebug's console.dir doesn't support multiple objects here
      // but maybe custom reporters will
      reporter.dir.apply(reporter, arguments);
    }
    else {
      this.log.apply(this, arguments);
    }
  },


  /**
    Prints an XML outline for any HTML or XML object.

    Logs the object using {@link SC.Logger.log} if reporter.dirxml function
    does not exist.

    @param {Object}
  */
  dirxml: function() {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.dirxml === "function")) {
      // Firebug's console.dirxml doesn't support multiple objects here
      // but maybe custom reporters will
      reporter.dirxml.apply(reporter, arguments);
    }
    else {
      this.log.apply(this, arguments);
    }
  },



  /**
    Begins the JavaScript profiler, if it exists. Call {@link SC.Logger.profileEnd}
    to end the profiling process and receive a report.

    @param {String}     (optional)  A title to associate with the profile
    @returns {Boolean} YES if reporter.profile exists, NO otherwise
  */
  profile: function(title) {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.profile === "function")) {
      reporter.profile(title);
      return YES;
    }
    return NO;
  },

  /**
    Ends the JavaScript profiler, if it exists.  If you specify a title, the
    profile with that title will be ended.

    @param {String}     (optional)  A title to associate with the profile
    @returns {Boolean} YES if reporter.profileEnd exists, NO otherwise
    @see SC.Logger.profile
  */
  profileEnd: function(title) {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.profileEnd === "function")) {
      reporter.profileEnd(title);
      return YES;
    }
    return NO;
  },


  /**
    Measure the time between when this function is called and
    {@link SC.Logger.timeEnd} is called.

    @param {String}     The name of the profile to begin
    @returns {Boolean} YES if reporter.time exists, NO otherwise
    @see SC.Logger.timeEnd
  */
  time: function(name) {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.time === "function")) {
      reporter.time(name);
      return YES;
    }
    return NO;
  },

  /**
    Ends the profile specified.

    @param {String}     The name of the profile to end
    @returns {Boolean}  YES if reporter.timeEnd exists, NO otherwise
    @see SC.Logger.time
  */
  timeEnd: function(name) {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.timeEnd === "function")) {
      reporter.timeEnd(name);
      return YES;
    }
    return NO;
  },


  /**
    Prints a stack-trace.

    @returns {Boolean} YES if reporter.trace exists, NO otherwise
  */
  trace: function() {
    var reporter = this.get('reporter');

    if (this.get('exists')  &&  (typeof reporter.trace === "function")) {
      reporter.trace();
      return YES;
    }
    return NO;
  },




  // ..........................................................
  // INTERNAL SUPPORT
  //

  init: function() {
    sc_super();

    // Set a reasonable default value if none has been set.
    if (!this.get('logOutputLevel')) {
      if (SC.buildMode === "debug") {
        this.set('logOutputLevel', SC.LOGGER_LEVEL_DEBUG);
      }
      else {
        this.set('logOutputLevel', SC.LOGGER_LEVEL_INFO);
      }
    }

    this.debugEnabledDidChange();
  },


  /** @private
    For backwards compatibility with the older 'debugEnabled' property, set
    our log output level to SC.LOGGER_LEVEL_DEBUG if 'debugEnabled' is set to
    YES.
  */
  debugEnabledDidChange: function() {
    if (this.get('debugEnabled')) {
      this.set('logOutputLevel', SC.LOGGER_LEVEL_DEBUG);
    }
  }.observes('debugEnabled'),



  /** @private
    Outputs and/or records the specified message of the specified type if the
    respective current log levels allow for it.  Assuming
    'automaticallyFormat' is specified, then String.fmt() will be called
    automatically on the message, but only if at least one of the log levels
    is such that the result will be used.

    @param {String}               type                 Expected to be SC.LOGGER_LEVEL_DEBUG, etc.
    @param {Boolean}              automaticallyFormat  Whether or not to treat 'message' as a format string if there are additional arguments
    @param {String}               message              Expected to a string format (for String.fmt()) if there are other arguments
    @param {String}   (optional)  originalArguments    All arguments passed into debug(), etc. (which includes 'message'; for efficiency, we don’t copy it)
  */
  _handleMessage: function(type, automaticallyFormat, message, originalArguments) {
    // Are we configured to show this type?
    var shouldOutput = this._shouldOutputType(type),
        shouldRecord = this._shouldRecordType(type),
        hasOtherArguments, i, len, args, output, entry, prefix,
        outputPrefix, recordedPrefix;

    // If we're neither going to output nor record the message, then stop now.
    if (!(shouldOutput || shouldRecord)) return;

    // Do we have arguments other than 'message'?  (Remember that
    // 'originalArguments' contains the message here, too, hence the > 1.)
    hasOtherArguments = (originalArguments  &&  originalArguments.length > 1);

    // If we're automatically formatting and there is no message (or it is
    // not a string), then don't automatically format after all.
    if (automaticallyFormat  &&  (SC.none(message)  ||  (typeof message !== "string"))) {
      automaticallyFormat = NO;
    }

    // If we should automatically format, and the client specified other
    // arguments in addition to the message, then we'll call .fmt() assuming
    // that the message is a format string.
    if (automaticallyFormat) {
      if (hasOtherArguments) {
        args = [];
        for (i = 1, len = originalArguments.length;  i < len;  ++i) {
          args.push(originalArguments[i]);
        }
        message = message.fmt.apply(message, args);
      }
    }

    // If a message prefix was specified, use it.
    prefix = this.get('messagePrefix');
    if (prefix) message = prefix + message;

    if (shouldOutput) {
      outputPrefix = this.get('outputMessagePrefix');

      // We only want to pass the original arguments to _outputMessage() if we
      // didn't format the message ourselves.
      args = automaticallyFormat ? null : originalArguments;
      this._outputMessage(type, null, this._outputIndentationLevel, (outputPrefix ? outputPrefix + message : message), args);
    }

    // If we're recording the log, append the message now.
    if (shouldRecord) {
      recordedPrefix = this.get('recordedMessagePrefix');

      entry = {
        type:      type,
        message:   message ? (recordedPrefix ? recordedPrefix + message : message) : YES,
        timestamp: new Date()
      };

      // If we didn't automatically format, and we have other arguments, then
      // be sure to record them, too.
      if (!automaticallyFormat  &&  hasOtherArguments) {
        entry.originalArguments = originalArguments;
      }

      this._addRecordedMessageEntry(entry);
    }
  },


  /** @private
    Outputs and/or records a group with the (optional) specified title
    assuming the respective current log levels allow for it.  This will output
    the title (if there is one) and indent all further messages (of any type)
    until _handleGroupEnd() is invoked.

    If additional arguments beyond a title are passed in, then String.fmt()
    will be called automatically on the title, but only if at least one of the
    log levels is such that the result will be used.

    @param {String}              type                 Expected to be SC.LOGGER_LEVEL_DEBUG, etc.
    @param {String}  (optional)  title                Expected to a string format (for String.fmt()) if there are other arguments
    @param {String}  (optional)  originalArguments    All arguments passed into debug(), etc. (which includes 'title'; for efficiency, we don’t copy it)
  */
  _handleGroup: function(type, title, originalArguments) {
    // Are we configured to show this type?
    var shouldOutput = this._shouldOutputType(type),
        shouldRecord = this._shouldRecordType(type),
        hasOtherArguments, i, len, args, arg, reporter, func, header, output,
        indentation, entry;

    // If we're neither going to output nor record the group, then stop now.
    if (!(shouldOutput || shouldRecord)) return;

    // Do we have arguments other than 'title'?  (Remember that
    // 'originalArguments' contains the title here, too, hence the > 1.)
    hasOtherArguments = (originalArguments  &&  originalArguments.length > 1);

    // If the client specified a title as well other arguments, then we'll
    // call .fmt() assuming that the title is a format string.
    if (title  &&  hasOtherArguments) {
      args = [];
      for (i = 1, len = originalArguments.length;  i < len;  ++i) {
        args.push(originalArguments[i]);
      }
      title = title.fmt.apply(title, args);
    }

    if (shouldOutput) {
      this._outputGroup(type, null, this._outputIndentationLevel, title);

      // Increase our indentation level to accommodate the group.
      this._outputIndentationLevel++;
    }

    // If we're recording the group, append the entry now.
    if (shouldRecord) {
      // Increase our indentation level to accommodate the group.
      indentation = ++this._recordingIndentationLevel;

      entry = {
        type:         type,
        indentation:  indentation,
        beginGroup:   YES,
        title:        title,
        timestamp:    new Date()
      };

      this._addRecordedMessageEntry(entry);
    }
  },


  /** @private
    Outputs and/or records a “group end” assuming the respective current log
    levels allow for it.  This will remove one level of indentation from all
    further messages (of any type).

    @param {String}              type                 Expected to be SC.LOGGER_LEVEL_DEBUG, etc.
  */
  _handleGroupEnd: function(type) {
    // Are we configured to show this type?
    var shouldOutput = this._shouldOutputType(type),
        shouldRecord = this._shouldRecordType(type),
        reporter, func, indentation, entry;

    // If we're neither going to output nor record the "group end", then stop
    // now.
    if (!(shouldOutput || shouldRecord)) return;

    if (shouldOutput) {
      // Decrease our indentation level to accommodate the group.
      this._outputIndentationLevel--;

      if (this.get('exists')) {
        // Do we have reporter.groupEnd defined as a function?  If not, we
        // simply won't output anything.
        reporter = this.get('reporter');
        func     = reporter.groupEnd;
        if (func) {
          func.call(reporter);
        }
      }
    }

    // If we're recording the “group end”, append the entry now.
    if (shouldRecord) {
      // Decrease our indentation level to accommodate the group.
      indentation = --this._recordingIndentationLevel;

      entry = {
        type:         type,
        indentation:  indentation,
        timestamp:    new Date()
      };

      this._addRecordedMessageEntry(entry);
    }
  },


  /** @private
    Returns whether a message of the specified type ('debug', etc.) should be
    output to the reporter based on the current value of 'logOutputLevel'.

    @param {Constant}  type
    @returns {Boolean}
  */
  _shouldOutputType: function(type) {
    var logLevelMapping = this._LOG_LEVEL_MAPPING,
        level           = logLevelMapping[type]                        ||  0,
        currentLevel    = logLevelMapping[this.get('logOutputLevel')]  ||  0;

    return (level <= currentLevel);
  },


  /** @private
    Returns whether a message of the specified type ('debug', etc.) should be
    recorded based on the current value of 'logRecordingLevel'.

    @param {Constant}  type
    @returns {Boolean}
  */
  _shouldRecordType: function(type) {
    // This is the same code as in _shouldOutputType(), but inlined to
    // avoid yet another function call.
    var logLevelMapping = this._LOG_LEVEL_MAPPING,
        level           = logLevelMapping[type]                           ||  0,
        currentLevel  = logLevelMapping[this.get('logRecordingLevel')]  ||  0;

    return (level <= currentLevel);
  },


  /** @private
    Outputs the specified message to the current reporter.  If the reporter
    does not handle the specified type of message, it will fall back to using
    log() if possible.

    @param {Constant}               type
    @param {String}                 timestampStr       An optional timestamp prefix for the line, or null for none
    @param {Number}                 indentation        The current indentation level
    @param {String}                 message
    @param {Arguments}  (optional)  originalArguments  If specified, the assumption is that the message was not automatically formatted
  */
  _outputMessage: function(type, timestampStr, indentation, message, originalArguments) {
    if (!this.get('exists')) return;

    // Do we have reporter[type] defined as a function?  If not, we'll fall
    // back to reporter.log if that exists.
    var reporter = this.get('reporter'),
        output, shouldIndent, func, prefix, args, arg;

    // If the reporter doesn't support group(), then we need to manually
    // include indentation for the group.  (It it does, we'll assume that
    // we're currently at the correct group level.)
    shouldIndent = !reporter.group;

    // Note:  Normally we wouldn't do the hash dereference twice, but
    //        storing the result like this:
    //
    //          var nativeFunction = console[type];
    //          nativeFunction(output);
    //
    //        …doesn't work in Safari 4, and:
    //
    //          nativeFunction.call(console, output);
    //
    //        …doesn't work in IE8 because the console.* methods are
    //       reported as being objects.
    func = reporter[type];
    if (func) {
      // If we formatted, just include the message.  Otherwise, include all
      // the original arguments.
      if (!originalArguments) {
        output = timestampStr ? timestampStr : "";
        if (shouldIndent) output += this._indentation(indentation);
        output += message;
        reporter[type](output);
      }
      else {
        // We have arguments?  Then pass them along to the reporter function
        // so that it can format them appropriately.  We'll use the timestamp
        // string (if there is one) and the indentation as the first
        // arguments.
        args = this._argumentsToArray(originalArguments);
        prefix = "";
        if (timestampStr) prefix = timestampStr;
        if (shouldIndent) prefix += this._indentation(indentation);
        if (prefix) args.splice(0, 0, prefix);

        if (func.apply) {
          func.apply(reporter, args);
        }
        else {
          // In IE8, passing the arguments as an array isn't ideal, but it's
          // pretty much all we can do because we can't call apply().
          reporter[type](args);
        }
      }
    }
    else {
      // The reporter doesn't support the requested function?  If it at least
      // support log(), fall back to that.
      if (reporter.log) {
        prefix = "";
        if (timestampStr) prefix = timestampStr;
        prefix += this._LOG_FALLBACK_PREFIX_MAPPING[type] || "";
        if (shouldIndent) prefix += this._indentation(indentation);

        // If we formatted, just include the message.  Otherwise, include
        // all the original arguments.
        if (!originalArguments) {
          reporter.log(prefix + message);
        }
        else {
          args = this._argumentsToArray(originalArguments);
          if (prefix) args.splice(0, 0, prefix);
          reporter.log(args);
        }
      }
    }
  },


  /** @private
    Outputs the specified “begin group” directive to the current reporter.  If
    the reporter does not handle the group() method, it will fall back to
    simulating using log() if possible.

    @param {Constant}               type
    @param {String}                 timestampStr  An optional timestamp prefix for the line, or null for none
    @param {Number}                 indentation   The current indentation level, not including what the group will set it to
    @param {String}     (optional)  title
  */
  _outputGroup: function(type, timestampStr, indentation, title) {
    if (!this.get('exists')) return;

    // Do we have reporter.group defined as a function?  If not, we'll fall
    // back to reporter.log if that exists.  (Thankfully, we can avoid the IE8
    // special-casing we have in _outputMessage() because IE8 doesn't support
    // console.group(), anyway.)
    var reporter = this.get('reporter'),
        func     = reporter.group,
        output;

    if (func) {
      output = timestampStr ? timestampStr : "";
      output += title;
      func.call(reporter, output);
    }
    else if (reporter.log) {
      // The reporter doesn't support group()?  Then simulate with log().
      // (We'll live with the duplicitous dereference rather than using
      // apply() to work around the IE8 issue described in _outputMessage().)
      output = "";
      if (timestampStr) output = timestampStr;
      output += this._LOG_FALLBACK_PREFIX_MAPPING[type] || "";
      output += this._indentation(indentation);
      output += SC.LOGGER_LOG_GROUP_HEADER.fmt(title);
      reporter.log(output);
    }
  },


  /** @private
    This method will add the specified entry to the recorded log messages
    array and also prune array as necessary according to the current values of
    'recordedLogMessagesMaximumLength' and
    'recordedLogMessagesPruningMinimumLength'.
  */
  _addRecordedMessageEntry: function(entry) {
    var recordedMessages = this.get('recordedLogMessages'),
        len;

    // Lazily create the array.
    if (!recordedMessages) {
      recordedMessages = [];
      this.set('recordedLogMessages', recordedMessages);
    }

    recordedMessages.push(entry);

    // Have we exceeded the maximum size?  If so, do some pruning.
    len = recordedMessages.length;
    if (len > this.get('recordedLogMessagesMaximumLength')) {
      recordedMessages.splice(0, (len - this.get('recordedLogMessagesPruningMinimumLength')));
    }

    // Notify that the array content changed.
    recordedMessages.enumerableContentDidChange();
  },



  /** @private
    The arguments function property doesn't support Array#unshift. This helper
    copies the elements of arguments to a blank array.

    @param {Array} arguments The arguments property of a function
    @returns {Array} An array containing the elements of arguments parameter
  */
  _argumentsToArray: function(args) {
    var ret = [],
        i, len;

    if (args) {
      for (i = 0, len = args.length;  i < len;  ++i) {
        ret[i] = args[i];
      }
    }
    return ret;
  },


  /** @private
    Formats the arguments array of a function by creating a string with
    SC.LOGGER_LOG_DELIMITER between the elements.
  */
  _argumentsToString: function() {
    var ret       = "",
        delimiter = SC.LOGGER_LOG_DELIMITER,
        i, len;

    for (i = 0, len = (arguments.length - 1);  i < len;  ++i) {
      ret += arguments[i] + delimiter;
    }
    ret += arguments[len];
    return ret;
  },


  /** @private
    Returns a string containing the appropriate indentation for the specified
    indentation level.

    @param {Number}  The indentation level
    @returns {String}
  */
  _indentation: function(level) {
    if (!level  ||  level < 0) {
      level = 0;
    }

    var ret    = "",
        indent = SC.LOGGER_LOG_GROUP_INDENTATION,
        i;

    for (i = 0;  i < level;  ++i) {
      ret += indent;
    }
    return ret;
  },



  /** @private
    The current “for output” indentation level.  The reporter (browser
    console) is expected to keep track of this for us for output, but we need
    to do our own bookkeeping if the browser doesn’t support console.group.
    This is incremented by _debugGroup() and friends, and decremented by
    _debugGroupEnd() and friends.
  */
  _outputIndentationLevel: 0,


  /** @private
    The current “for recording” indentation level.  This can be different than
    the “for output” indentation level if the respective log levels are set
    differently.  This is incremented by _debugGroup() and friends, and
    decremented by _debugGroupEnd() and friends.
  */
  _recordingIndentationLevel: 0,


  /** @private
    A mapping of the log level constants (SC.LOGGER_LEVEL_DEBUG, etc.) to
    their priority.  This makes it easy to determine which levels are “higher”
    than the current level.

    Implementation note:  We’re hardcoding the values of the constants defined
    earlier here for a tiny bit of efficiency (we can create the hash all at
    once rather than having to push in keys).
  */
  _LOG_LEVEL_MAPPING: { debug: 4, info: 3, warn: 2, error: 1, none: 0 },


  /** @private
    If the current reporter does not support a particular type of log message
    (for example, some older browsers’ consoles support console.log but not
    console.debug), we’ll use the specified prefixes.

    Implementation note:  We’re hardcoding the values of the constants defined
    earlier here for a tiny bit of efficiency (we can create the hash all at
    once rather than having to push in keys).
  */
  _LOG_FALLBACK_PREFIX_MAPPING: {
    debug:  SC.LOGGER_LOG_DEBUG,
    info:   SC.LOGGER_LOG_INFO,
    warn:   SC.LOGGER_LOG_WARN,
    error:  SC.LOGGER_LOG_ERROR
  }

});


// Add convenient shorthands methods to SC.
SC.debug = SC.Logger.debug;
SC.info  = SC.Logger.info;
SC.warn  = SC.Logger.warn;
SC.error = SC.Logger.error;
