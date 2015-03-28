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
