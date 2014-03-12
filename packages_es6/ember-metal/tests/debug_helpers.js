/*globals EmberDev*/

function expectAssertion(fn, message) {
  // do not assert as the production builds do not contain Ember.assert
   if (EmberDev.runningProdBuild){
     ok(true, 'Assertions disabled in production builds.');
     return;
   }

   raises(fn, message);
}


export {expectAssertion};
