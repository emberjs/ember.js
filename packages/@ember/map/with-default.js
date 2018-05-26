import { deprecate } from '@ember/debug';
import Map from './index';
import { copyMap } from './lib/utils';

/**
  @class MapWithDefault
  @extends Map
  @private
  @constructor
  @param [options]
    @param {*} [options.defaultValue]
*/
export default class MapWithDefault extends Map {
  constructor(options) {
    deprecate(
      'Use of @ember/MapWithDefault is deprecated. Please use native `Map` instead',
      false,
      {
        id: 'ember-map-deprecation',
        until: '3.5.0',
      }
    );

    super();
    this.defaultValue = options.defaultValue;
  }

  /**
    @method create
    @static
    @param [options]
      @param {*} [options.defaultValue]
    @return {MapWithDefault|Map} If options are passed, returns
      `MapWithDefault` otherwise returns `EmberMap`
    @private
  */
  static create(options) {
    if (options) {
      return new MapWithDefault(options);
    } else {
      return new Map();
    }
  }

  /**
    Retrieve the value associated with a given key.

    @method get
    @param {*} key
    @return {*} the value associated with the key, or the default value
    @private
  */
  get(key) {
    let hasValue = this.has(key);

    if (hasValue) {
      return super.get(key);
    } else {
      let defaultValue = this.defaultValue(key);
      this.set(key, defaultValue);
      return defaultValue;
    }
  }

  /**
    @method copy
    @return {MapWithDefault}
    @private
  */
  copy() {
    let Constructor = this.constructor;
    return copyMap(
      this,
      new Constructor({
        defaultValue: this.defaultValue,
      })
    );
  }
}
