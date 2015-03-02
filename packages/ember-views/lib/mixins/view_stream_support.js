import { Mixin } from "ember-metal/mixin";
import SimpleStream from "ember-metal/streams/simple";

var ViewStreamSupport = Mixin.create({
  init() {
    this._super.apply(this, arguments);
    this._scopeStream = new SimpleStream(this).getKey('context');
  },

  getStream(path) {
    var stream = this._scopeStream.get(path);
    stream._label = path;

    return stream;
  }
});

export default ViewStreamSupport;
