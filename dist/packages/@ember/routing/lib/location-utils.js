/**
  @private

  Returns the current `location.pathname`, normalized for IE inconsistencies.
*/
export function getPath(location) {
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
export function getQuery(location) {
  return location.search;
}
/**
  @private

  Returns the hash or empty string
*/
export function getHash(location) {
  if (location.hash !== undefined) {
    return location.hash.substring(0);
  }
  return '';
}
export function getFullPath(location) {
  return getPath(location) + getQuery(location) + getHash(location);
}
export function getOrigin(location) {
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
/**
  Replaces the current location, making sure we explicitly include the origin
  to prevent redirecting to a different origin.

  @private
*/
export function replacePath(location, path) {
  location.replace(getOrigin(location) + path);
}