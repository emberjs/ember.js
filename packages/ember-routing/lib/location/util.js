/**
  @private

  Returns the current `location.pathname`, normalized for IE inconsistencies.
*/
export function getPath(location) {
  var pathname = location.pathname;
  // Various versions of IE/Opera don't always return a leading slash
  if (pathname.charAt(0) !== '/') {
    pathname = '/' + pathname;
  }

  return pathname;
}

/**
  @private

  Returns the current `location.search`.
*/
export function getQuery(location) {
  return location.search;
}

/**
  @private

  Returns the current `location.hash` by parsing location.href since browsers
  inconsistently URL-decode `location.hash`.

  Should be passed the browser's `location` object as the first argument.

  https://bugzilla.mozilla.org/show_bug.cgi?id=483304
*/
export function getHash(location) {
  var href = location.href;
  var hashIndex = href.indexOf('#');

  if (hashIndex === -1) {
    return '';
  } else {
    return href.substr(hashIndex);
  }
}

export function getFullPath(location) {
  return getPath(location) + getQuery(location) + getHash(location);
}

export function getOrigin(location) {
  var origin = location.origin;

  // Older browsers, especially IE, don't have origin
  if (!origin) {
    origin = location.protocol + '//' + location.hostname;

    if (location.port) {
      origin += ':' + location.port;
    }
  }

  return origin;
}

/*
  `documentMode` only exist in Internet Explorer, and it's tested because IE8 running in
  IE7 compatibility mode claims to support `onhashchange` but actually does not.

  `global` is an object that may have an `onhashchange` property.

  @private
  @function supportsHashChange
*/
export function supportsHashChange(documentMode, global) {
  return ('onhashchange' in global) && (documentMode === undefined || documentMode > 7);
}

/*
  `userAgent` is a user agent string. We use user agent testing here, because
  the stock Android browser in Gingerbread has a buggy versions of this API,
  Before feature detecting, we blacklist a browser identifying as both Android 2
  and Mobile Safari, but not Chrome.

  @private
  @function supportsHistory
*/
export function supportsHistory(userAgent, history) {
  // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
  // The stock browser on Android 2.2 & 2.3 returns positive on history support
  // Unfortunately support is really buggy and there is no clean way to detect
  // these bugs, so we fall back to a user agent sniff :(

  // We only want Android 2, stock browser, and not Chrome which identifies
  // itself as 'Mobile Safari' as well
  if (userAgent.indexOf('Android 2') !== -1 &&
      userAgent.indexOf('Mobile Safari') !== -1 &&
      userAgent.indexOf('Chrome') === -1) {
    return false;
  }

  return !!(history && 'pushState' in history);
}

/**
  Replaces the current location, making sure we explicitly include the origin
  to prevent redirecting to a different origin.

  @private
*/
export function replacePath(location, path) {
  location.replace(getOrigin(location) + path);
}
