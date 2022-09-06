declare module '@ember/object/proxy' {
  import EmberObject from '@ember/object';

  /**
   * `Ember.ObjectProxy` forwards all properties not defined by the proxy itself
   * to a proxied `content` object.
   */
  export default class ObjectProxy<T extends object = object> extends EmberObject {
    /**
     * The object whose properties will be forwarded.
     */
    content: T | undefined;

    get<K extends keyof this>(key: K): this[K];
    get<K extends keyof T>(key: K): T[K] | undefined;

    getProperties<K extends keyof this>(list: K[]): Pick<this, K>;
    getProperties<K extends keyof this>(...list: K[]): Pick<this, K>;
    getProperties<K extends keyof T>(list: K[]): Pick<Partial<T>, K>;
    getProperties<K extends keyof T>(...list: K[]): Pick<Partial<T>, K>;

    set<K extends keyof this>(key: K, value: this[K]): this[K];
    set<K extends keyof T>(key: K, value: T[K]): T[K];

    setProperties<K extends keyof this | keyof T>(hash: Pick<this & T, K>): Pick<this & T, K>;
  }
}
