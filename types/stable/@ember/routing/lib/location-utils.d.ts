declare module '@ember/routing/lib/location-utils' {
  /**
      @private

      Returns the current `location.pathname`, normalized for IE inconsistencies.
    */
  export function getPath(location: Location): string;
  /**
      @private

      Returns the current `location.search`.
    */
  export function getQuery(location: Location): string;
  /**
      @private

      Returns the hash or empty string
    */
  export function getHash(location: Location): string;
  export function getFullPath(location: Location): string;
  export function getOrigin(location: Location): string;
  /**
      Replaces the current location, making sure we explicitly include the origin
      to prevent redirecting to a different origin.

      @private
    */
  export function replacePath(location: Location, path: string): void;
}
