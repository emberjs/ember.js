/**
  @private

  Returns the current `location.pathname`, ensuring it has a leading slash.
*/
export function getPath(location: Location): string {
  let pathname = location.pathname;
  if (pathname[0] !== '/') {
    pathname = `/${pathname}`;
  }

  return pathname;
}

/**
  @private

  Returns the current `location.search`.
*/
export function getQuery(location: Location): string {
  return location.search;
}

/**
  @private

  Returns the hash or empty string
*/
export function getHash(location: Location): string {
  if (location.hash !== undefined) {
    return location.hash.substring(0);
  }

  return '';
}

export function getFullPath(location: Location): string {
  return getPath(location) + getQuery(location) + getHash(location);
}

/**
  Replaces the current location, making sure we explicitly include the origin
  to prevent redirecting to a different origin.

  @private
*/
export function replacePath(location: Location, path: string): void {
  location.replace(location.origin + path);
}
