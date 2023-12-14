declare module '@ember/routing/lib/cache' {
  /**
      A two-tiered cache with support for fallback values when doing lookups.
      Uses "buckets" and then "keys" to cache values.

      @private
      @class BucketCache
    */
  export default class BucketCache {
    cache: Map<string, Map<string, any>>;
    constructor();
    has(bucketKey: string): boolean;
    stash(bucketKey: string, key: string, value: any): void;
    lookup(bucketKey: string, prop: string, defaultValue: any): any;
  }
}
