// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.supplement(Number.prototype, {

  /**
   * Returns the oridnal associated for the current number:
   *
   * eg: 1 => 'st', 2 => 'nd'
   *
   *
   * If the current Locale exists (which it almost always does except for in
   * testing) we try and delegate to it. Otherwise we use this inner anonymous
   * function (to prevent further mucking with the prototype)
   *
   */
  ordinal: function () {
    // FAST PATH: If we have a localization, use its ordinals.
    if (SC.Locale) {
      return SC.Locale.currentLocale.ordinalForNumber(this);
    }

    // Otherwise, fall back on a basic (en) implementation (e.g. in testing, or as
    // the datetime framework only requires the runtime framework).
    var d = this % 10;
    return (~~(this % 100 / 10) === 1) ? 'th' :
      (d === 1) ? 'st' :
        (d === 2) ? 'nd' :
          (d === 3) ? 'rd' : 'th';
  }

});