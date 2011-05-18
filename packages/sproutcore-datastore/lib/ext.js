require('sproutcore-runtime');

SC.Object.reopen({
  /**
    Sets the property only if the passed value is different from the
    current value.  Depending on how expensive a get() is on this property,
    this may be more efficient.

    NOTE: By default, the set() method will not set the value unless it has
    changed. However, this check can skipped by setting .property().idempotent(NO)
    setIfChanged() may be useful in this case.

    @param {String|Hash} key the key to change
    @param {Object} value the value to change
    @returns {SC.Observable}
  */
  setIfChanged: function(key, value) {
    if(value === undefined && SC.typeOf(key) === SC.T_HASH) {
      var hash = key;

      for(key in hash) {
        if (!hash.hasOwnProperty(key)) continue;
        this.setIfChanged(key, hash[key]);
      }

      return this;
    }

    return (this.get(key) !== value) ? this.set(key, value) : this ;
  }
});
