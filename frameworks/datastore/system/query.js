// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('core') ;
sc_require('models/record');

/**
  @class

  This class permits you to perform queries on your data store or a remote
  data store. Here is a simple example of a local query:

      query = SC.Query.create({
        conditions: "firstName = 'Jonny' AND lastName = 'Cash'"
      });

  To find all records of your store, that match the query, use find with
  the query as an argument:

      records = MyApp.store.find(query);

  `records` will be a record array containing all matching records.
  To limit the query to a record type of `MyApp.MyModel`,
  you can specify the type as a property of the query like this:

      query = SC.Query.create({
        conditions: "firstName = 'Jonny' AND lastName = 'Cash'",
        recordType: MyApp.MyModel
      });

  Calling `find()` like above will now return only records of type MyApp.MyModel.
  It is recommended to limit your query to a record type, since the query will
  have to look for matching records in the whole store if no record type
  is given.

  You can give an order, which the resulting records should follow, like this:

      query = SC.Query.create({
        conditions: "firstName = 'Jonny' AND lastName = 'Cash'",
        recordType: MyApp.MyModel,
        orderBy: "lastName, year DESC"
      });

  The default order direction is ascending. You can change it to descending
  by writing `'DESC'` behind the property name like in the example above.
  If no order is given, or records are equal in respect to a given order,
  records will be ordered by their storeKey.

  You can check if a certain record matches the query by calling

      query.contains(record);

  SproutCore Query Language
  =====

  Features of the query language:

  Primitives:

   - record properties
   - `null`, `undefined`
   - `true`, `false`
   - numbers (integers and floats)
   - strings (double or single quoted)

  Parameters:

   - `%@` (wild card)
   - `{parameterName}` (named parameter)

  Wild cards are used to identify parameters by the order in which they appear
  in the query string. Named parameters can be used when tracking the order
  becomes difficult. Both types of parameters can be used by giving the
  parameters as a property to your query object:

      yourQuery.parameters = yourParameters

  where yourParameters should have one of the following formats:

   * for wild cards: `[firstParam, secondParam, thirdParam]`
   * for named params: `{name1: param1, mane2: parma2}`

  You cannot use both types of parameters in a single query!

  Operators:

   - `=`
   - `!=`
   - `<`
   - `<=`
   - `>`
   - `>=`
   - `BEGINS_WITH` -- (checks if a string starts with another one)
   - `ENDS_WITH` --   (checks if a string ends with another one)
   - `CONTAINS` --    (checks if a string contains another one, or if an
                      object is in an array)
   - `MATCHES` --     (checks if a string is matched by a regexp,
                      you will have to use a parameter to insert the regexp)
   - `ANY` --         (checks if the thing on its left is contained in the array
                      on its right, you will have to use a parameter
                      to insert the array)
   - `TYPE_IS` --     (unary operator expecting a string containing the name
                      of a Model class on its right side, only records of this
                      type will match)

  Boolean Operators:

   - `AND`
   - `OR`
   - `NOT`

  Parenthesis for grouping:

   - `(` and `)`


  Adding Your Own Query Handlers
  ---

  You can extend the query language with your own operators by calling:

      SC.Query.registerQueryExtension('your_operator', your_operator_definition);

  See details below. As well you can provide your own comparison functions
  to control ordering of specific record properties like this:

      SC.Query.registerComparison(property_name, comparison_for_this_property);

  @extends SC.Object
  @extends SC.Copyable
  @extends SC.Freezable
  @since SproutCore 1.0
*/

SC.Query = SC.Object.extend(SC.Copyable, SC.Freezable,
  /** @scope SC.Query.prototype */ {

  //@if(debug)
  /* BEGIN DEBUG ONLY PROPERTIES AND METHODS */

  /* @private */
  toString: function () {
    var conditions = this.get('conditions'),
      location = this.get('location'),
      parameters = this.get('parameters');

    return "%@.%@({ conditions: '%@', parameters: %@, … })".fmt(this.constructor.toString(), location, conditions, SC.inspect(parameters));
  },

  /* END DEBUG ONLY PROPERTIES AND METHODS */
  //@endif

  // ..........................................................
  // PROPERTIES
  //

  /**
    Walk like a duck.

    @type Boolean
  */
  isQuery: YES,

  /**
    Unparsed query conditions.  If you are handling a query yourself, then
    you will find the base query string here.

    @type String
  */
  conditions:  null,

  /**
    Optional orderBy parameters.  This can be a string of keys, optionally
    ending with the strings `" DESC"` or `" ASC"` to select descending or
    ascending order.

    Alternatively, you can specify a comparison function, in which case the
    two records will be sent to it.  Your comparison function, as with any
    other, is expected to return -1, 0, or 1.

    @type String | Function
  */
  orderBy:     null,

  /**
    The base record type or types for the query.  This must be specified to
    filter the kinds of records this query will work on.  You may either
    set this to a single record type or to an array or set of record types.

    @type SC.Record
  */
  recordType:  null,

  /**
    Optional array of multiple record types.  If the query accepts multiple
    record types, this is how you can check for it.

    @type SC.Enumerable
  */
  recordTypes: null,

  /**
    Returns the complete set of `recordType`s matched by this query.  Includes
    any named `recordType`s plus their subclasses.

    @property
    @type SC.Enumerable
  */
  expandedRecordTypes: function() {
    var ret = SC.CoreSet.create(), rt, q  ;

    if (rt = this.get('recordType')) this._scq_expandRecordType(rt, ret);
    else if (rt = this.get('recordTypes')) {
      rt.forEach(function(t) { this._scq_expandRecordType(t, ret); }, this);
    } else this._scq_expandRecordType(SC.Record, ret);

    // save in queue.  if a new recordtype is defined, we will be notified.
    q = SC.Query._scq_queriesWithExpandedRecordTypes;
    if (!q) {
      q = SC.Query._scq_queriesWithExpandedRecordTypes = SC.CoreSet.create();
    }
    q.add(this);

    return ret.freeze() ;
  }.property('recordType', 'recordTypes').cacheable(),

  /** @private
    expands a single record type into the set. called recursively
  */
  _scq_expandRecordType: function(recordType, set) {
    if (set.contains(recordType)) return; // nothing to do
    set.add(recordType);

    if (SC.typeOf(recordType)===SC.T_STRING) {
      recordType = SC.objectForPropertyPath(recordType);
    }

    recordType.subclasses.forEach(function(t) {
      this._scq_expandRecordType(t, set);
    }, this);
  },

  /**
    Optional hash of parameters.  These parameters may be interpolated into
    the query conditions.  If you are handling the query manually, these
    parameters will not be used.

    @type Hash
  */
  parameters:  null,

  /**
    Indicates the location where the result set for this query is stored.
    Currently the available options are:

     - `SC.Query.LOCAL` -- indicates that the query results will be
       automatically computed from the in-memory store.
     - `SC.Query.REMOTE` -- indicates that the query results are kept on a
       remote server and hence must be loaded from the `DataSource`.

    The default setting for this property is `SC.Query.LOCAL`.

    Note that even if a query location is `LOCAL`, your `DataSource` will
    still have its `fetch()` method called for the query.  For `LOCAL`
    queries, you  won't need to explicitly provide the query result set; you
    can just load records into the in-memory store as needed and let the query
    recompute automatically.

    If your query location is `REMOTE`, then your `DataSource` will need to
    provide the actual set of query results manually.  Usually you will only
    need to use a `REMOTE` query if you are retrieving a large data set and you
    don't want to pay the cost of computing the result set client side.

    @type String
  */
  location: 'local', // SC.Query.LOCAL

  /**
    Another query that will optionally limit the search of records.  This is
    usually configured for you when you do `find()` from another record array.

    @type SC.Query
  */
  scope: null,


  /**
    Returns `YES` if query location is Remote.  This is sometimes more
    convenient than checking the location.

		@property
    @type Boolean
  */
  isRemote: function() {
    return this.get('location') === SC.Query.REMOTE;
  }.property('location').cacheable(),

  /**
    Returns `YES` if query location is Local.  This is sometimes more
    convenient than checking the location.

		@property
    @type Boolean
  */
  isLocal: function() {
    return this.get('location') === SC.Query.LOCAL;
  }.property('location').cacheable(),

  /**
    Indicates whether a record is editable or not.  Defaults to `NO`.  Local
    queries should never be made editable.  Remote queries may be editable or
    not depending on the data source.
  */
  isEditable: NO,

  // ..........................................................
  // PRIMITIVE METHODS
  //

  /**
    Returns `YES` if record is matched by the query, `NO` otherwise.  This is
    used when computing a query locally.

    @param {SC.Record} record the record to check
    @param {Hash} parameters optional override parameters
    @returns {Boolean} YES if record belongs, NO otherwise
  */
  contains: function(record, parameters) {

    // check the recordType if specified
    var rtype, ret = YES ;
    if (rtype = this.get('recordTypes')) { // plural form
      ret = rtype.find(function(t) { return SC.kindOf(record, t); });
    } else if (rtype = this.get('recordType')) { // singular
      ret = SC.kindOf(record, rtype);
    }

    if (!ret) return NO ; // if either did not pass, does not contain

    // if we have a scope - check for that as well
    var scope = this.get('scope');
    if (scope && !scope.contains(record)) return NO ;

    // now try parsing
    if (!this._isReady) this.parse(); // prepare the query if needed
    if (!this._isReady) return NO ;
    if (parameters === undefined) parameters = this.parameters || this;

    // if parsing worked we check if record is contained
    // if parsing failed no record will be contained
    return this._tokenTree.evaluate(record, parameters);
  },

  /**
    Returns `YES` if the query matches one or more of the record types in the
    passed set.

    @param {SC.Set} types set of record types
    @returns {Boolean} YES if record types match
  */
  containsRecordTypes: function(types) {
    var rtype = this.get('recordType');
    if (rtype) {
      return !!types.find(function(t) { return SC.kindOf(t, rtype); });

    } else if (rtype = this.get('recordTypes')) {
      return !!rtype.find(function(t) {
        return !!types.find(function(t2) { return SC.kindOf(t2,t); });
      });

    } else return YES; // allow anything through
  },

  /**
    Returns the sort order of the two passed records, taking into account the
    orderBy property set on this query.  This method does not verify that the
    two records actually belong in the query set or not; this is checked using
    `contains()`.

    @param {SC.Record} record1 the first record
    @param {SC.Record} record2 the second record
    @returns {Number} -1 if record1 < record2,
                      +1 if record1 > record2,
                      0 if equal
  */
  compare: function(record1, record2) {
    var result = 0,
        propertyName, order, len, i, methodName;

    // fast cases go here
    if (record1 === record2) return 0;

    // if called for the first time we have to build the order array
    if (!this._isReady) this.parse();
    if (!this._isReady) { // can't parse, so use storeKey.  Not proper, but consistent.
      return SC.compare(record1.get('storeKey'),record2.get('storeKey'));
    }

    // For every property specified in orderBy until non-eql result is found.
    // Or, if orderBy is a comparison function, simply invoke it with the
    // records.
    order = this._order;
    if (SC.typeOf(order) === SC.T_FUNCTION) {
      result = order.call(null, record1, record2);
    }
    else {
      len   = order ? order.length : 0;
      for (i=0; result===0 && (i < len); i++) {
        propertyName = order[i].propertyName;
        methodName   = /\./.test(propertyName) ? 'getPath' : 'get';
        // if this property has a registered comparison use that
        if (SC.Query.comparisons[propertyName]) {
          result = SC.Query.comparisons[propertyName](
                    record1[methodName](propertyName), record2[methodName](propertyName));

        // if not use default SC.compare()
        } else {
          result = SC.compare(
                    record1[methodName](propertyName), record2[methodName](propertyName));
        }

        if ((result!==0) && order[i].descending) result = (-1) * result;
      }
    }

    // return result or compare by storeKey
    if (result !== 0) return result ;
    else return SC.compare(record1.get('storeKey'), record2.get('storeKey'));
  },

  /** @private
      Becomes YES once the query has been successfully parsed
  */
  _isReady:     NO,

  /**
    This method has to be called before the query object can be used.
    You will normally not have to do this; it will be called automatically
    if you try to evaluate a query.
    You can, however, use this function for testing your queries.

    @returns {Boolean} true if parsing succeeded, false otherwise
  */
  parse: function() {
    var conditions = this.get('conditions'),
        lang       = this.get('queryLanguage'),
        tokens, tree;

    tokens = this._tokenList = this.tokenizeString(conditions, lang);
    tree = this._tokenTree = this.buildTokenTree(tokens, lang);
    this._order = this.buildOrder(this.get('orderBy'));

    this._isReady = !!tree && !tree.error;
    if (tree && tree.error) throw tree.error;
    return this._isReady;
  },

  /**
    Returns the same query but with the scope set to the passed record array.
    This will copy the receiver.  It also stores these queries in a cache to
    reuse them if possible.

    @param {SC.RecordArray} recordArray the scope
    @returns {SC.Query} new query
  */
  queryWithScope: function(recordArray) {
    // look for a cached query on record array.
    var key = SC.keyFor('__query__', SC.guidFor(this)),
        ret = recordArray[key];

    if (!ret) {
      recordArray[key] = ret = this.copy();
      ret.set('scope', recordArray);
      ret.freeze();
    }

    return ret ;
  },

  // ..........................................................
  // PRIVATE SUPPORT
  //

  /** @private
    Properties that need to be copied when cloning the query.
  */
  copyKeys: ['conditions', 'orderBy', 'recordType', 'recordTypes', 'parameters', 'location', 'scope'],

  /** @private */
  concatenatedProperties: ['copyKeys'],

  /** @private
    Implement the Copyable API to clone a query object once it has been
    created.
  */
  copy: function() {
    var opts = {},
        keys = this.get('copyKeys'),
        loc  = keys ? keys.length : 0,
        key, value, ret;

    while(--loc >= 0) {
      key = keys[loc];
      value = this.get(key);
      if (value !== undefined) opts[key] = value ;
    }

    ret = this.constructor.create(opts);
    opts = null;
    return ret ;
  },

  // ..........................................................
  // QUERY LANGUAGE DEFINITION
  //


  /**
    This is the definition of the query language. You can extend it
    by using `SC.Query.registerQueryExtension()`.
  */
  queryLanguage: {

    'UNKNOWN': {
      firstCharacter:   /[^\s'"\w\d\(\)\{\}]/,
      notAllowed:       /[\-\s'"\w\d\(\)\{\}]/
    },

    'PROPERTY': {
      firstCharacter:   /[a-zA-Z_]/,
      notAllowed:       /[^a-zA-Z_0-9\.]/,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) {
                          var tokens = this.tokenValue.split('.');

                          var len = tokens.length;
                          if (len < 2) return r.get(this.tokenValue);

                          var ret = r;
                          for (var i = 0; i < len; i++) {
                            if (!ret) return;
                            if (ret.get) {
                              ret = ret.get(tokens[i]);
                            } else {
                              ret = ret[tokens[i]];
                            }
                          }
                          return ret;
                        }
    },

    'NUMBER': {
      firstCharacter:   /[\d\-]/,
      notAllowed:       /[^\d\-\.]/,
      format:           /^-?\d+$|^-?\d+\.\d+$/,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return parseFloat(this.tokenValue); }
    },

    'STRING': {
      firstCharacter:   /['"]/,
      delimited:        true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return this.tokenValue; }
    },

    'PARAMETER': {
      firstCharacter:   /\{/,
      lastCharacter:    '}',
      delimited:        true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return w[this.tokenValue]; }
    },

    '%@': {
      rememberCount:    true,
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return w[this.tokenValue]; }
    },

    'OPEN_PAREN': {
      firstCharacter:   /\(/,
      singleCharacter:  true
    },

    'CLOSE_PAREN': {
      firstCharacter:   /\)/,
      singleCharacter:  true
    },

    'AND': {
      reservedWord:     true,
      leftType:         'BOOLEAN',
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left && right;
                        }
    },

    'OR': {
      reservedWord:     true,
      leftType:         'BOOLEAN',
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left || right;
                        }
    },

    'NOT': {
      reservedWord:     true,
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var right = this.rightSide.evaluate(r,w);
                          return !right;
                        }
    },

    '=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return SC.isEqual(left, right);
                        }
    },

    '!=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return !SC.isEqual(left, right);
                        }
    },

    '<': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return SC.compare(left, right) == -1; //left < right;
                        }
    },

    '<=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return SC.compare(left, right) != 1; //left <= right;
                        }
    },

    '>': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return SC.compare(left, right) == 1; //left > right;
                        }
    },

    '>=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return SC.compare(left, right) != -1; //left >= right;
                        }
    },

    'BEGINS_WITH': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var all   = this.leftSide.evaluate(r,w);
                          var start = this.rightSide.evaluate(r,w);
                          return ( all && all.indexOf(start) === 0 );
                        }
    },

    'ENDS_WITH': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var all = this.leftSide.evaluate(r,w);
                          var end = this.rightSide.evaluate(r,w);
                          return ( all && all.length >= end.length && all.lastIndexOf(end) === (all.length - end.length));
                        }
    },

    'CONTAINS': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
        evaluate:       function (r,w) {
                          var all    = this.leftSide.evaluate(r,w) || [];
                          var value = this.rightSide.evaluate(r,w);

                          var allType = SC.typeOf(all);
                          if (allType === SC.T_STRING) {
                            return (all.indexOf(value) !== -1);
                          } else if (allType === SC.T_ARRAY || all.toArray) {
                            if (allType !== SC.T_ARRAY) all = all.toArray();
                            var found  = false;
                            var i      = 0;
                            while ( found===false && i<all.length ) {
                              if ( value == all[i] ) found = true;
                              i++;
                            }
                            return found;
                          }
                        }
    },

    'ANY': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var prop   = this.leftSide.evaluate(r,w);
                          var values = this.rightSide.evaluate(r,w);
                          var found  = false;
                          var i      = 0;
                          while ( found===false && i<values.length ) {
                            if ( prop == values[i] ) found = true;
                            i++;
                          }
                          return found;
                        }
    },

    'MATCHES': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var toMatch = this.leftSide.evaluate(r,w);
                          var matchWith = this.rightSide.evaluate(r,w);
                          return matchWith.test(toMatch);
                        }
    },

    'TYPE_IS': {
      reservedWord:     true,
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var actualType = SC.Store.recordTypeFor(r.storeKey);
                          var right      = this.rightSide.evaluate(r,w);
                          var expectType = SC.objectForPropertyPath(right);
                          return actualType == expectType;
                        }
    },

    'null': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return null; }
    },

    'undefined': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return undefined; }
    },

    'false': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return false; }
    },

    'true': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return true; }
    },

    'YES': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return true; }
    },

    'NO': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return false; }
    }

  },


  // ..........................................................
  // TOKENIZER
  //


  /**
    Takes a string and tokenizes it based on the grammar definition
    provided. Called by `parse()`.

    @param {String} inputString the string to tokenize
    @param {Object} grammar the grammar definition (normally queryLanguage)
    @returns {Array} list of tokens
  */
  tokenizeString: function (inputString, grammar) {


    var tokenList           = [],
        c                   = null,
        t                   = null,
        token               = null,
        tokenType           = null,
        currentToken        = null,
        currentTokenType    = null,
        currentTokenValue   = null,
        currentDelimiter    = null,
        endOfString         = false,
        endOfToken          = false,
        belongsToToken      = false,
        skipThisCharacter   = false,
        rememberCount       = {};


    // helper function that adds tokens to the tokenList

    function addToken (tokenType, tokenValue) {
      t = grammar[tokenType];
      //tokenType = t.tokenType;

      // handling of special cases
      // check format
      if (t.format && !t.format.test(tokenValue)) tokenType = "UNKNOWN";
      // delimited token (e.g. by ")
      if (t.delimited) skipThisCharacter = true;

      // reserved words
      if ( !t.delimited ) {
        for ( var anotherToken in grammar ) {
          if ( grammar[anotherToken].reservedWord
               && anotherToken == tokenValue ) {
            tokenType = anotherToken;
          }
        }
      }

      // reset t
      t = grammar[tokenType];
      // remembering count type
      if ( t && t.rememberCount ) {
        if (!rememberCount[tokenType]) rememberCount[tokenType] = 0;
        tokenValue = rememberCount[tokenType];
        rememberCount[tokenType] += 1;
      }

      // push token to list
      tokenList.push( {tokenType: tokenType, tokenValue: tokenValue} );

      // and clean up currentToken
      currentToken      = null;
      currentTokenType  = null;
      currentTokenValue = null;
    }


    // stepping through the string:

    if (!inputString) return [];

    var iStLength = inputString.length;

    for (var i=0; i < iStLength; i++) {

      // end reached?
      endOfString = (i===iStLength-1);

      // current character
      c = inputString.charAt(i);

      // set true after end of delimited token so that
      // final delimiter is not caught again
      skipThisCharacter = false;


      // if currently inside a token

      if ( currentToken ) {

        // some helpers
        t = grammar[currentToken];
        endOfToken = t.delimited ? c===currentDelimiter : t.notAllowed.test(c);

        // if still in token
        if ( !endOfToken ) currentTokenValue += c;

        // if end of token reached
        if (endOfToken || endOfString) {
          addToken(currentToken, currentTokenValue);
        }

        // if end of string don't check again
        if ( endOfString && !endOfToken ) skipThisCharacter = true;
      }

      // if not inside a token, look for next one

      if ( !currentToken && !skipThisCharacter ) {
        // look for matching tokenType
        for ( token in grammar ) {
          t = grammar[token];
          if (t.firstCharacter && t.firstCharacter.test(c)) {
            currentToken = token;
          }
        }

        // if tokenType found
        if ( currentToken ) {
          t = grammar[currentToken];
          currentTokenValue = c;
          // handling of special cases
          if ( t.delimited ) {
            currentTokenValue = "";
            if ( t.lastCharacter ) currentDelimiter = t.lastCharacter;
            else currentDelimiter = c;
          }

          if ( t.singleCharacter || endOfString ) {
            addToken(currentToken, currentTokenValue);
          }
        }
      }
    }

    return tokenList;
  },



  // ..........................................................
  // BUILD TOKEN TREE
  //

  /**
    Takes an array of tokens and returns a tree, depending on the
    specified tree logic. The returned object will have an error property
    if building of the tree failed. Check it to get some information
    about what happend.
    If everything worked, the tree can be evaluated by calling

        tree.evaluate(record, parameters)

    If `tokenList` is empty, a single token will be returned which will
    evaluate to true for all records.

    @param {Array} tokenList the list of tokens
    @param {Object} treeLogic the logic definition (normally queryLanguage)
    @returns {Object} token tree
  */
  buildTokenTree: function (tokenList, treeLogic) {

    var l                    = tokenList.slice();
    var i                    = 0;
    var openParenthesisStack = [];
    var shouldCheckAgain     = false;
    var error                = [];


    // empty tokenList is a special case
    if (!tokenList || tokenList.length === 0) {
      return { evaluate: function(){ return true; } };
    }


    // some helper functions

    function tokenLogic (position) {
      var p = position;
      if ( p < 0 ) return false;

      var tl = treeLogic[l[p].tokenType];

      if ( ! tl ) {
        error.push("logic for token '"+l[p].tokenType+"' is not defined");
        return false;
      }

      // save evaluate in token, so that we don't have
      // to look it up again when evaluating the tree
      l[p].evaluate = tl.evaluate;
      return tl;
    }

    function expectedType (side, position) {
      var p = position;
      var tl = tokenLogic(p);
      if ( !tl )            return false;
      if (side == 'left')   return tl.leftType;
      if (side == 'right')  return tl.rightType;
    }

    function evalType (position) {
      var p = position;
      var tl = tokenLogic(p);
      if ( !tl )  return false;
      else        return tl.evalType;
    }

    function removeToken (position) {
      l.splice(position, 1);
      if ( position <= i ) i--;
    }

    function preceedingTokenExists (position) {
      var p = position || i;
      if ( p > 0 )  return true;
      else          return false;
    }

    function tokenIsMissingChilds (position) {
      var p = position;
      if ( p < 0 )  return true;
      return (expectedType('left',p) && !l[p].leftSide)
          || (expectedType('right',p) && !l[p].rightSide);
    }

    function typesAreMatching (parent, child) {
      var side = (child < parent) ? 'left' : 'right';
      if ( parent < 0 || child < 0 )                      return false;
      if ( !expectedType(side,parent) )                   return false;
      if ( !evalType(child) )                             return false;
      if ( expectedType(side,parent) == evalType(child) ) return true;
      else                                                return false;
    }

    function preceedingTokenCanBeMadeChild (position) {
      var p = position;
      if ( !tokenIsMissingChilds(p) )   return false;
      if ( !preceedingTokenExists(p) )  return false;
      if ( typesAreMatching(p,p-1) )    return true;
      else                              return false;
    }

    function preceedingTokenCanBeMadeParent (position) {
      var p = position;
      if ( tokenIsMissingChilds(p) )    return false;
      if ( !preceedingTokenExists(p) )  return false;
      if ( !tokenIsMissingChilds(p-1) ) return false;
      if ( typesAreMatching(p-1,p) )    return true;
      else                              return false;
    }

    function makeChild (position) {
      var p = position;
      if (p<1) return false;
      l[p].leftSide = l[p-1];
      removeToken(p-1);
    }

    function makeParent (position) {
      var p = position;
      if (p<1) return false;
      l[p-1].rightSide = l[p];
      removeToken(p);
    }

    function removeParenthesesPair (position) {
      removeToken(position);
      removeToken(openParenthesisStack.pop());
    }

    // step through the tokenList

    for (i=0; i < l.length; i++) {
      shouldCheckAgain = false;

      if ( l[i].tokenType == 'UNKNOWN' ) {
        error.push('found unknown token: '+l[i].tokenValue);
      }

      if ( l[i].tokenType == 'OPEN_PAREN' ) openParenthesisStack.push(i);
      if ( l[i].tokenType == 'CLOSE_PAREN' ) removeParenthesesPair(i);

      if ( preceedingTokenCanBeMadeChild(i) ) makeChild(i);

      if ( preceedingTokenCanBeMadeParent(i) ){
        makeParent(i);
        shouldCheckAgain = true;
      }

      if ( shouldCheckAgain ) i--;

    }

    // error if tokenList l is not a single token now
    if (l.length == 1) l = l[0];
    else error.push('string did not resolve to a single tree');

    // error?
    if (error.length > 0) return {error: error.join(',\n'), tree: l};
    // everything fine - token list is now a tree and can be returned
    else return l;

  },


  // ..........................................................
  // ORDERING
  //

  /**
    Takes a string containing an order statement and returns an array
    describing this order for easier processing.
    Called by `parse()`.

    @param {String | Function} orderOp the string containing the order statement, or a comparison function
    @returns {Array | Function} array of order statement, or a function if a function was specified
  */
  buildOrder: function (orderOp) {
    if (!orderOp) {
      return [];
    }
    else if (SC.typeOf(orderOp) === SC.T_FUNCTION) {
      return orderOp;
    }
    else {
      var o = orderOp.split(',');
      for (var i=0; i < o.length; i++) {
        var p = o[i];
        p = p.replace(/^\s+|\s+$/,'');
        p = p.replace(/\s+/,',');
        p = p.split(',');
        o[i] = {propertyName: p[0]};
        if (p[1] && p[1] == 'DESC') o[i].descending = true;
      }

      return o;
    }

  }

});


// Class Methods
SC.Query.mixin( /** @scope SC.Query */ {

  /**
    Constant used for `SC.Query#location`

    @type String
  */
  LOCAL: 'local',

  /**
    Constant used for `SC.Query#location`

    @type String
  */
  REMOTE: 'remote',

  /**
    Given a query, returns the associated `storeKey`.  For the inverse of this
    method see `SC.Store.queryFor()`.

    @param {SC.Query} query the query
    @returns {Number} a storeKey.
  */
  storeKeyFor: function(query) {
    return query ? query.get('storeKey') : null;
  },

  /**
    Will find which records match a give `SC.Query` and return an array of
    store keys. This will also apply the sorting for the query.

    @param {SC.Query} query to apply
    @param {SC.RecordArray} records to search within
    @param {SC.Store} store to materialize record from
    @returns {Array} array instance of store keys matching the SC.Query (sorted)
  */
  containsRecords: function(query, records, store) {
    var ret = [];
    for(var idx=0,len=records.get('length');idx<len;idx++) {
      var record = records.objectAt(idx);
      if(record && query.contains(record)) {
        ret.push(record.get('storeKey'));
      }
    }

    ret = SC.Query.orderStoreKeys(ret, query, store);

    return ret;
  },

  /**
    Sorts a set of store keys according to the orderBy property
    of the `SC.Query`.

    @param {Array} storeKeys to sort
    @param {SC.Query} query to use for sorting
    @param {SC.Store} store to materialize records from
    @returns {Array} sorted store keys.  may be same instance as passed value
  */
  orderStoreKeys: function(storeKeys, query, store) {
    // apply the sort if there is one
    if (storeKeys) {
      var res = storeKeys.sort(function(a, b) {
        return SC.Query.compareStoreKeys(query, store, a, b);
      });
    }

    return storeKeys;
  },

  /**
    Default sort method that is used when calling `containsStoreKeys()`
    or `containsRecords()` on this query. Simply materializes two records
    based on `storekey`s before passing on to `compare()`.

    @param {Number} storeKey1 a store key
    @param {Number} storeKey2 a store key
    @returns {Number} -1 if record1 < record2,  +1 if record1 > record2, 0 if equal
  */
  compareStoreKeys: function(query, store, storeKey1, storeKey2) {
    var record1     = store.materializeRecord(storeKey1),
        record2     = store.materializeRecord(storeKey2);

    return query.compare(record1, record2);
  },

  /**
    Returns a `SC.Query` instance reflecting the passed properties.  Where
    possible this method will return cached query instances so that multiple
    calls to this method will return the same instance.  This is not possible
    however, when you pass custom parameters or set ordering. All returned
    queries are frozen.

    Usually you will not call this method directly.  Instead use the more
    convenient `SC.Query.local()` and `SC.Query.remote()`.

    Examples

    There are a number of different ways you can call this method.

    The following return local queries selecting all records of a particular
    type or types, including any subclasses:

        var people = SC.Query.local(Ab.Person);
        var peopleAndCompanies = SC.Query.local([Ab.Person, Ab.Company]);

        var people = SC.Query.local('Ab.Person');
        var peopleAndCompanies = SC.Query.local('Ab.Person Ab.Company'.w());

        var allRecords = SC.Query.local(SC.Record);

    The following will match a particular type of condition:

        var married = SC.Query.local(Ab.Person, "isMarried=YES");
        var married = SC.Query.local(Ab.Person, "isMarried=%@", [YES]);
        var married = SC.Query.local(Ab.Person, "isMarried={married}", {
          married: YES
        });

    You can also pass a hash of options as the second parameter.  This is
    how you specify an order, for example:

        var orderedPeople = SC.Query.local(Ab.Person, { orderBy: "firstName" });

    @param {String} location the query location.
    @param {SC.Record|Array} recordType the record type or types.
    @param {String} [conditions] The conditions string.
    @param {Object} [parameters] The parameters object.
    @returns {SC.Query}
  */
  build: function(location, recordType, conditions, parameters) {

    var opts = null,
        ret, cache, key, tmp;

    // fast case for query objects.
    if (recordType && recordType.isQuery) {
      if (recordType.get('location') === location) return recordType;
      else return recordType.copy().set('location', location).freeze();
    }

    // normalize recordType
    if (typeof recordType === SC.T_STRING) {
      ret = SC.objectForPropertyPath(recordType);
      if (!ret) throw new Error("%@ did not resolve to a class".fmt(recordType));
      recordType = ret ;
    } else if (recordType && recordType.isEnumerable) {
      ret = [];
      recordType.forEach(function(t) {
        if (typeof t === SC.T_STRING) t = SC.objectForPropertyPath(t);
        if (!t) throw new Error("cannot resolve record types: %@".fmt(recordType));
        ret.push(t);
      }, this);
      recordType = ret ;
    } else if (!recordType) recordType = SC.Record; // find all records

    if (parameters === undefined) parameters = null;
    if (conditions === undefined) conditions = null;

    // normalize other parameters. if conditions is just a hash, treat as opts
    if (!parameters && (typeof conditions !== SC.T_STRING)) {
      opts = conditions;
      conditions = null ;
    }

    // special case - easy to cache.
    if (!parameters && !opts) {

      tmp = SC.Query._scq_recordTypeCache;
      if (!tmp) tmp = SC.Query._scq_recordTypeCache = {};
      cache = tmp[location];
      if (!cache) cache = tmp[location] = {};

      if (recordType.isEnumerable) {
        key = recordType.map(function(k) { return SC.guidFor(k); });
        key = key.sort().join(':');
      } else key = SC.guidFor(recordType);

      if (conditions) key = [key, conditions].join('::');

      ret = cache[key];
      if (!ret) {
        if (recordType.isEnumerable) {
          opts = { recordTypes: recordType.copy() };
        } else opts = { recordType: recordType };

        opts.location = location ;
        opts.conditions = conditions ;
        ret = cache[key] = SC.Query.create(opts).freeze();
      }
    // otherwise parse extra conditions and handle them
    } else {

      if (!opts) opts = {};
      if (!opts.location) opts.location = location ; // allow override

      // pass one or more recordTypes.
      if (recordType && recordType.isEnumerable) {
        opts.recordTypes = recordType;
      } else opts.recordType = recordType;

      // set conditions and parameters if needed
      if (conditions) opts.conditions = conditions;
      if (parameters) opts.parameters = parameters;

      ret = SC.Query.create(opts).freeze();
    }

    return ret ;
  },

  /**
    Returns a `LOCAL` query with the passed properties.

    For example,

        // Show all the accounts with a value greater than 100.
        query = SC.Query.local(MyApp.Account, {
          conditions: 'value > {amt}',
          parameters: { amt: 100 },
          orderBy: 'value DESC'
        });

    @param {SC.Record|Array} recordType the record type or types.
    @param {Object} [properties] Additional properties to be added to the query.
    @returns {SC.Query}
  */
  local: function(recordType, properties, oldParameters) {
    //@if(debug)
    // We are going to remove all argument overloading in the framework.  It adds
    // code bloat, increased complexity, edge case errors and makes
    // memorizing the API difficult.  Rather than support a long list of
    // arguments that we can't safely collapse, it makes more sense to just
    // accept a properties object as the proper argument.
    if (SC.none(properties) && !SC.none(oldParameters) || SC.typeOf(properties) === SC.T_STRING) {
      SC.warn("Developer Warning: Passing a conditions string and parameters object to SC.Query.local has been deprecated.  Please use a properties hash as per the documentation.");
    }
    //@endif
    return this.build(SC.Query.LOCAL, recordType, properties, oldParameters);
  },

  /**
    Returns a `REMOTE` query with the passed properties.

    For example,

        // The data source can alter its remote request using the value of
        // `query.beginsWith`.
        query = SC.Query.remote(MyApp.Person, { beginsWith: 'T' });

    @param {SC.Record|Array} recordType the record type or types.
    @param {Object} [properties] Additional properties to be added to the query.
    @returns {SC.Query}
  */
  remote: function(recordType, properties, oldParameters) {
    // This used to have arguments: conditions and params.  Because both
    // conditions and params are optional, the developer may be passing in null
    // conditions with a params object in order to use query.parameters or they
    // may be passing a conditions object which ended up becoming direct
    // properties of the query.
    // Long story short, argument overloading continues to suck ass!
    // @if(debug)
    if (SC.none(properties) && !SC.none(oldParameters) || SC.typeOf(properties) === SC.T_STRING) {
      SC.warn("Developer Warning: SC.Query.remote should not include conditions and parameters arguments.  These properties are unique to local queries.  To add properties to a remote query for the data source to use, please pass a properties hash as the second argument to `remote`.");
    }
    // @endif
    return this.build(SC.Query.REMOTE, recordType, properties, oldParameters);
  },

  /** @private
    called by `SC.Record.extend()`. invalidates `expandedRecordTypes`
  */
  _scq_didDefineRecordType: function() {
    var q = SC.Query._scq_queriesWithExpandedRecordTypes;
    if (q) {
      q.forEach(function(query) {
        query.notifyPropertyChange('expandedRecordTypes');
      }, this);
      q.clear();
    }
  }

});


/** @private
  Hash of registered comparisons by property name.
*/
SC.Query.comparisons = {};

/**
  Call to register a comparison for a specific property name.
  The function you pass should accept two values of this property
  and return -1 if the first is smaller than the second,
  0 if they are equal and 1 if the first is greater than the second.

  @param {String} name of the record property
  @param {Function} custom comparison function
  @returns {SC.Query} receiver
*/
SC.Query.registerComparison = function(propertyName, comparison) {
  SC.Query.comparisons[propertyName] = comparison;
};


/**
  Call to register an extension for the query language.
  You should provide a name for your extension and a definition
  specifying how it should be parsed and evaluated.

  Have a look at `queryLanguage` for examples of definitions.

  TODO add better documentation here

  @param {String} tokenName name of the operator
  @param {Object} token extension definition
  @returns {SC.Query} receiver
*/
SC.Query.registerQueryExtension = function(tokenName, token) {
  SC.Query.prototype.queryLanguage[tokenName] = token;
};

// shorthand
SC.Q = SC.Query.from ;

