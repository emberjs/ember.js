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
  // `path` is joined straight onto the origin, so a value that does not begin
  // with a slash (e.g. `@evil.com`) would be reparsed as part of the authority:
  // `http://app.com` + `@evil.com` becomes `http://app.com@evil.com`, where the
  // origin's host turns into userinfo and `evil.com` becomes the host. Force a
  // leading slash so the origin always stays the authority.
  if (path.charAt(0) !== '/') {
    path = `/${path}`;
  }

  location.replace(location.origin + path);
}
