import isEnabled from 'ember-metal/features';

/*
  This private helper is used in conjuntion with the get keyword
  @private
*/

if (isEnabled('ember-htmlbars-get-helper')) {
  var getHelper = function getHelper([value]) {
    return value;
  };
}

export default getHelper;
