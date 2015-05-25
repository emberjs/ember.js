import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import {
  getArrayValues,
  getHashValues
} from "ember-htmlbars/streams/utils";

export default function HelperFactoryStream(helperFactory, params, hash, label) {
  this.init(label);
  this.helperFactory = helperFactory;
  this.params = params;
  this.hash = hash;
  this.linkable = true;
  this.helper = null;
}

HelperFactoryStream.prototype = create(Stream.prototype);

merge(HelperFactoryStream.prototype, {
  compute() {
    if (!this.helper) {
      this.helper = this.helperFactory.create({ _stream: this });
    }
    return this.helper.compute(getArrayValues(this.params), getHashValues(this.hash));
  },
  deactivate() {
    this.super$deactivate();
    if (this.helper) {
      this.helper.destroy();
      this.helper = null;
    }
  },
  super$deactivate: HelperFactoryStream.prototype.deactivate
});
