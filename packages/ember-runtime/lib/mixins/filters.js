/*
  Use this to introduce filters to your ember objects in order to do interesting things before or after
  key methods are called. This is often a better option than extending and monkeypatching a method
  to introduce your behaviour. 

  You should use the filters like this:

      setup: function(context) {
        this.fbefore('setup', this, arguments)

        // do the setup

        // optionally call after, in case this method doesn't return a value
        this.fafter('setup', this, arguments)          
      }

  A typical use case would be to log the state at that point without having to set break points or
  monkey-patching with `console.logs` directly into the ember code.

  For the use case where you want to log a particular aspect of Ember, f.ex the Ember.Router, 
  you can add a `beforeAnyMethod` function to Ember.Router like this:

  Ember.Router.reopen({
    fbeforeAnyMethod: function(args) {
      var funName = args[0];
      console.log "before:" + funName, args.slice(1)
    },

    fafterAnyMethod: function(args) {
      var funName = args[0];
      console.log "after:" + funName, args.slice(1)
    },    
  })

  Then you will have complete output of what goes on internally in Ember.
  You can then further make switch statements here, in order to control for which functions you want
  to do something (such as logging). Powerful stuff!

  Another typical use case, is when you want to wrap/convert the state of the object (or arguments) 
  before a particular method is called. It could f.x be that you want to wrap the context object
  with `R` (from the RubyJS project), in order to always add the R API to your models or array 
  of models. You might also want to change how Ember resolves its naming convention magic, 
  in order to add specific namespaces in some cases to better suit your needs. 
  There are many possibilities. Use your imagination ;)

  @class Filters
  @namespace Ember
  @extends Ember.Mixin      
*/
Ember.Filters = Ember.Mixin.create({
  /*
    Takes the method, f.ex `setup` and tries to execute `beforeSetup`
    if such a method exists in the current context, with the arguments given
    The convention is to call before like this:

        setup: function(context) {
          this.fbefore('setup', this, arguments)
        }

   @param {String} name The name of the function that called `before`
  */
  fbefore: function(methodName) {
    var filterName = 'fbefore' + methodName.camelize;
    this._callFilter(filterName, arguments);
    this._filterAny('fbefore', methodName, arguments);
  },

  /*
    Takes the method, f.ex `setup` and tries to execute `afterSetup`
    if such a method exists in the current context, with the arguments given
    The convention is to call after like this:

        setup: function(context) {
          // do the setup

          // call after in case this method doesn't return a value
          // Note: In some cases you might want to call `after` just before 
          // the method returns a value
          this.fafter('setup', this, arguments)          
        }
    @param {String} name The name of the function that called `after`
  */
  fafter: function(methodName) {
    var filterName = 'fafter' + methodName.camelize;
    this._callFilter(filterName, arguments);
    this._filterAny('fafter', methodName, arguments);
  },

  /*
    Check to see if a filter function exists in the current context
    Executes the filter if it does exist.

    @private
    @param {String} filterName The name of filter function to call, f.ex `beforeSetup`
  */
  _callFilter: function(filterName, args) {
    if (this[filterName])
      this[filterName].apply(args);    
  },

  /*
    Called from either `before` or `after` with a where argument (that equalt 'befor' or 'after')

    When where = 'before'
    Checks to see if a `beforeAnyMethod` filter function exists in the current context
    Executes the `beforeAnyMethod` filter with arguments, that include the name 
    of the original function that called the before or after filter.

    When where = 'after'
    Same as before.

    @private
    @param {String} where Either 'fbefore' or 'fafter'
    @param {String} methName The original name of the function that called before or after
    @param {String} args The arguments sent to before or after
  */
  _filterAny: function(where, methName, args) {
    var filterName = where + 'AnyMethod';
    this._callFilter(filterName, [methName, args]);
  }
});