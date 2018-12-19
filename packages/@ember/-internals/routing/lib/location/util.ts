/**
  @private

  Returns the current `location.pathname`, normalized for IE inconsistencies.
*/
export function getPath(location: Location) {
  let pathname = location.pathname;
  // Various versions of IE/Opera don't always return a leading slash
  if (pathname[0] !== '/') {
    pathname = `/${pathname}`;
  }

  return pathname;
}

/**
  @private

  Returns the current `location.search`.
*/
export function getQuery(location: Location) {
  return location.search;
}

/**
  @private

  Returns the hash or empty string
*/
export function getHash(location: Location) {
  if (location.hash !== undefined) {
    return location.hash.substr(0);
  }

  return '';
}

export function getFullPath(location: Location) {
  return getPath(location) + getQuery(location) + getHash(location);
}

export function getOrigin(location: Location) {
  let origin = location.origin;

  // Older browsers, especially IE, don't have origin
  if (!origin) {
    origin = `${location.protocol}//${location.hostname}`;

    if (location.port) {
      origin += `:${location.port}`;
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
export function supportsHashChange(documentMode: number | undefined, global: Window | null) {
  return global && 'onhashchange' in global && (documentMode === undefined || documentMode > 7);
}

/*
  `userAgent` is a user agent string. We use user agent testing here, because
  the stock Android browser is known to have buggy versions of the History API,
  in some Android versions.

  @private
  @function supportsHistory
*/
export function supportsHistory(userAgent: string, history: History) {
  // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
  // The stock browser on Android 2.2 & 2.3, and 4.0.x returns positive on history support
  // Unfortunately support is really buggy and there is no clean way to detect
  // these bugs, so we fall back to a user agent sniff :(

  // We only want Android 2 and 4.0, stock browser, and not Chrome which identifies
  // itself as 'Mobile Safari' as well, nor Windows Phone.
  if (
    (userAgent.indexOf('Android 2.') !== -1 || userAgent.indexOf('Android 4.0') !== -1) &&
    userAgent.indexOf('Mobile Safari') !== -1 &&
    userAgent.indexOf('Chrome') === -1 &&
    userAgent.indexOf('Windows Phone') === -1
  ) {
    return false;
  }

  return Boolean(history && 'pushState' in history);
}

/**
  Replaces the current location, making sure we explicitly include the origin
  to prevent redirecting to a different origin.

  @private
*/
export function replacePath(location: Location, path: string) {
  location.replace(getOrigin(location) + path);
}
