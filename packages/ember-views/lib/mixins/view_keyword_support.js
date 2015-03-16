import { Mixin } from "ember-metal/mixin";
import create from 'ember-metal/platform/create';
import KeyStream from "ember-views/streams/key_stream";

var ViewKeywordSupport = Mixin.create({
  init() {
    this._super(...arguments);

    if (!this._keywords) {
      this._keywords = create(null);
    }
    this._keywords._view = this;
    this._keywords.view = undefined;
    this._keywords.controller = new KeyStream(this, 'controller');
    this._setupKeywords();
  },

  _setupKeywords() {
    var keywords = this._keywords;
    var contextView = this._contextView || this._parentView;

    if (contextView) {
      var parentKeywords = contextView._keywords;

      keywords.view = this.isVirtual ? parentKeywords.view : this;

      for (var name in parentKeywords) {
        if (keywords[name]) {
          continue;
        }

        keywords[name] = parentKeywords[name];
      }
    } else {
      keywords.view = this.isVirtual ? null : this;
    }
  }
});

export default ViewKeywordSupport;
