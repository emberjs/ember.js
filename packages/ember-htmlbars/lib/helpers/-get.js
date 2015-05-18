/** @private
  this private helper is used in conjuntion with the get keyword
*/

if (Ember.FEATURES.isEnabled('ember-htmlbars-get-helper')) {

  var getHelper = function getHelper([value]) {
    return value;
  };

}

export default getHelper;
