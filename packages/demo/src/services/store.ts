import Cache from '@ember-data/json-api';
import EDataStore, { CacheHandler } from '@ember-data/store';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import Adapter from '@ember-data/adapter/json-api';

export default class Store extends EDataStore {
  #adapter = new Adapter();

  adapterFor() {
    return this.#adapter;
  }
  constructor() {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments);
    this.requestManager = new RequestManager();
    this.requestManager.use([Fetch]);
    this.requestManager.useCache(CacheHandler);
  }
  createCache(storeWrapper) {
    return new Cache(storeWrapper);
  }
}
