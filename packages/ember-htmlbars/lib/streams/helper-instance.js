import Stream from "ember-metal/streams/stream";
import merge from "ember-metal/merge";
import {
  getArrayValues,
  getHashValues
} from "ember-htmlbars/streams/utils";

export default function HelperInstanceStream(helper, params, hash, label) {
  this.init(label);
  this.helper = helper;
  this.params = params;
  this.hash = hash;
  this.linkable = true;
}

HelperInstanceStream.prototype = Object.create(Stream.prototype);

merge(HelperInstanceStream.prototype, {
  compute() {
    return this.helper.compute(getArrayValues(this.params), getHashValues(this.hash));
  }
});
