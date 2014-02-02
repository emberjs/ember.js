// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

/** @class

  The `SC.StatePathMatcher` is used to match a given state path match expression 
  against state paths. A state path is a basic dot-notion consisting of
  one or more state names joined using '.'. Ex: 'foo', 'foo.bar'. 
  
  The state path match expression language provides a way of expressing a state path.
  The expression is matched against a state path from the end of the state path
  to the beginning of the state path. A match is true if the expression has been
  satisfied by the given path. 
  
  Syntax:
  
    expression -> <this> <subpath> | <path>
    
    path -> <part> <subpath>
    
    subpath -> '.' <part> <subpath> | empty
  
    this -> 'this'
    
    part -> <name> | <expansion>
    
    expansion -> <name> '~' <name>
    
    name -> [a-z_][\w]*
    
  Expression examples:
  
    foo
    
    foo.bar
    
    foo.bar.mah
    
    foo~mah
    
    this.foo
    
    this.foo.bar
    
    this.foo~mah
    
    foo.bar~mah
    
    foo~bar.mah

  @extends SC.Object
  @author Michael Cohen
*/
SC.StatePathMatcher = SC.Object.extend(
  /** @scope SC.StatePathMatcher.prototype */{
    
  /**
    The state that is used to represent 'this' for the
    matcher's given expression.
    
    @field {SC.State}
    @see #expression
  */
  state: null,
    
  /**
    The expression used by this matcher to match against
    given state paths
    
    @field {String}
  */
  expression: null,
  
  /**
    A parsed set of tokens from the matcher's given expression
    
    @field {Array}
    @see #expression
  */
  tokens: null,
  
  init: function() {
    sc_super();
    this._parseExpression();
  },
  
  /** @private 
  
    Will parse the matcher's given expession by creating tokens and chaining them
    together.
    
    Note: Because the DSL for state path expressions is tiny, a simple hand-crafted 
    parser is being used. However, if the DSL becomes any more complex, then it will 
    probably be necessary to refactor the logic in order follow a more conventional 
    type of parser.
    
    @see #expression
  */
  _parseExpression: function() {
    var parts = this.expression ? this.expression.split('.') : [],
        len = parts.length, i = 0, part,
        chain = null, token, tokens = [];
      
    for (; i < len; i += 1) {
      part = parts[i];      
      
      if (part.indexOf('~') >= 0) {
        part = part.split('~');
        if (part.length > 2) {
          throw new Error("Invalid use of '~' at part %@".fmt(i));
        }
        token = SC.StatePathMatcher._ExpandToken.create({
          start: part[0], end: part[1]
        });
      } 
      
      else if (part === 'this') {
        if (tokens.length > 0) {
          throw new Error("Invalid use of 'this' at part %@".fmt(i));
        }
        token = SC.StatePathMatcher._ThisToken.create();
      }
      
      else {
        token = SC.StatePathMatcher._BasicToken.create({
          value: part
        });
      }
      
      token.owner = this;
      tokens.push(token);
    }

    this.set('tokens', tokens);

    var stack = SC.clone(tokens);
    this._chain = chain = stack.pop();
    while (token = stack.pop()) {
      chain.nextToken = token;
      chain = token;
    }
  },
  
  /**
    Returns the last part of the expression. So if the
    expression is 'foo.bar' or 'foo~bar' then 'bar' is returned
    in both cases. If the expression is 'this' then 'this is
    returned. 
  */
  lastPart: function() {
    var tokens = this.get('tokens'),
        len = tokens ? tokens.length : 0,
        token = len > 0 ? tokens[len -1] : null;
    return token.get('lastPart');
  }.property('tokens').cacheable(),
    
  /**
    Will make a state path against this matcher's expression. 
    
    The path provided must follow a basic dot-notation path containing
    one or dots '.'. Ex: 'foo', 'foo.bar'
    
    @param path {String} a dot-notation path
    @return {Boolean} true if there is a match, otherwise false
  */
  match: function(path) {
    this._stack = path.split('.');
    if (SC.empty(path) || SC.typeOf(path) !== SC.T_STRING) return NO;
    return this._chain.match();
  },
  
  /** @private */
  _pop: function() {
    this._lastPopped = this._stack.pop();
    return this._lastPopped;
  }

});

/** @private @class

  Base class used to represent a token the expression
*/
SC.StatePathMatcher._Token = SC.Object.extend({
  
  /** The type of this token */
  type: null,
  
  /** The state path matcher that owns this token */
  owner: null,
  
  /** The next token in the matching chain */
  nextToken: null,
  
  /** 
    The last part the token represents, which is either a valid state
    name or representation of a state
  */
  lastPart: null,
  
  /** 
    Used to match against what is currently on the owner's
    current path stack
  */
  match: function() { return NO; }
  
});

/** @private @class

  Represents a basic name of a state in the expression. Ex 'foo'. 
  
  A match is true if the matcher's current path stack is popped and the
  result matches this token's value.
*/
SC.StatePathMatcher._BasicToken = SC.StatePathMatcher._Token.extend({
    
  type: 'basic',
    
  value: null,
   
  lastPart: function() {
    return this.value; 
  }.property('value').cacheable(),
    
  match: function() {
    var part = this.owner._pop(),
        token = this.nextToken;
    if (this.value !== part) return NO;
    return token ? token.match() : YES;
  }
    
});
  
/** @private @class

  Represents an expanding path based on the use of the '<start>~<end>' syntax.
  <start> represents the start and <end> represents the end. 
  
  A match is true if the matcher's current path stack is first popped to match 
  <end> and eventually is popped to match <start>. If neither <end> nor <start>
  are satified then false is retuend.
*/
SC.StatePathMatcher._ExpandToken = SC.StatePathMatcher._Token.extend({
    
  type: 'expand',
    
  start: null,
    
  end: null,
  
  lastPart: function() {
    return this.end; 
  }.property('end').cacheable(),

  match: function() {
    var start = this.start,
        end = this.end, part,
        token = this.nextToken;
          
    part = this.owner._pop();
    if (part !== end) return NO;
      
    while (part = this.owner._pop()) {
      if (part === start) {
        return token ? token.match() : YES;
      }
    }
      
    return NO;
  }
    
});

/** @private @class
  
  Represents a this token, which is used to represent the owner's
  `state` property.
  
  A match is true if the last path part popped from the owner's
  current path stack is an immediate substate of the state this
  token represents.
*/
SC.StatePathMatcher._ThisToken = SC.StatePathMatcher._Token.extend({
    
  type: 'this',
  
  lastPart: 'this',
  
  match: function() {
    var state = this.owner.state,
        substates = state.get('substates'),
        len = substates.length, i = 0, part;
        
    part = this.owner._lastPopped;

    if (!part || this.owner._stack.length !== 0) return NO;
    
    for (; i < len; i += 1) {
      if (substates[i].get('name') === part) return YES;
    }
    
    return NO;
  }
  
});