// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  Allows for easier handling of the document.cookie object. To create a cookie,
  simply call SC.Cookie.create. To retrieve a cookie, use SC.Cookie.find.
  Cookies are not added to document.cookie, which SC.Cookie.find uses, until you
  have called SC.Cookie#write.

  Heavy inspiration from the
  {@link <a href="http://plugins.jquery.com/project/cookie">jQuery cookie plugin</a>}.

  @extends SC.Object
  @since Sproutcore 1.0
  @author Colin Campbell
*/

SC.Cookie = SC.Object.extend(
/** @scope SC.Cookie.prototype */{

  // ..........................................................
  // PROPERTIES
  //

  /**
    @type String
    @default null
  */
  name: null,

  /**
    @type String
    @default ''
  */
  value: '',

  /**
    Amount of time until the cookie expires. Set to -1 in order to delete the cookie.

    If passing an Integer, it is interpreted as a number of days.

    @type Integer|SC.DateTime|Date
    @default null
  */
  expires: null,

  /**
    @type String
    @deafult null
  */
  path: null,

  /**
    @type String
    @default null
  */
  domain: null,

  /**
    If true, the secure attribute of the cookie will be set and the cookie transmission will
    require a secure protocol (like HTTPS).

    @type Boolean
    @default NO
  */
  secure: NO,

  /**
    Walk like a duck

    @type Boolean
    @default YES
    @readOnly
  */
  isCookie: YES,


  // ..........................................................
  // METHODS
  //

  /**
    Sets SC.Cookie#expires to -1, which destroys the cookie.
  */
  destroy: function() {
    this.set('expires', -1);
    this.write();

    sc_super();
  },

  /**
    Writes this SC.Cookie to document.cookie and adds it to SC.Cookie collection. To find this
    cookie later, or on reload, use SC.Cookie.find.

    @see SC.Cookie.find
  */
  write: function() {
    var name = this.get('name'),
        value = this.get('value'),
        expires = this.get('expires'),
        path = this.get('path'),
        domain = this.get('domain'),
        secure = this.get('secure'),
        output = '',
        date;

    if (expires) {
      if (typeof expires === SC.T_NUMBER) {
        date = new Date();
        date.setTime(date.getTime() + (expires*24*60*60*1000));
      } else if (SC.DateTime && expires.get && expires.get('milliseconds')) {
        date = new Date(expires.get('milliseconds'));
      } else if (expires.toUTCString && expires.toUTCString.apply) {
        date = expires;
      }

      if (date) output = "; expires=" + date.toUTCString();
    }

    if (!SC.none(path)) output += '; path=' + path;
    if (!SC.none(domain)) output += '; domain=' + domain;
    if (secure === YES) output += '; secure';

    document.cookie = name + "=" + encodeURIComponent(value) + output;

    return this;
  }

});

SC.Cookie.mixin(
  /** @scope SC.Cookie */ {

  /**
    Finds a cookie that has been stored

    @param {String} name The name of the cookie
    @returns SC.Cookie object containing name and value of cookie
  */
  find: function(name) {
    if (document.cookie && document.cookie !== '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = SC.String.trim(String(cookies[i]));
        if (cookie.substring(0, name.length + 1) === (name + "=")) {
          return SC.Cookie.create({
            name: name,
            value: decodeURIComponent(cookie.substring(name.length + 1))
          });
        }
      }
    }
    return null;
  }

});

SC.CookieMonster = {
  nomNomNom: function(cookie) {
    var isCookie = SC.kindOf(cookie, SC.Cookie);
    if (isCookie) {
      SC.Logger.log("YUM!");
      return cookie.destroy();
    }
    
    SC.Logger.error("Y U PASS ME NO COOKIE? %@", cookie);
    return NO;
  }
};