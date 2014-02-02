// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals CoreTest module */

/**
 * jsDump
 * Copyright (c) 2008 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Licensed under BSD (http://www.opensource.org/licenses/bsd-license.php)
 * Date: 5/15/2008
 * @projectDescription Advanced and extensible data dumping for Javascript.
 * @version 1.0.0
 * @author Ariel Flesler
 * @link {http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html}
 */
(function(){
  var reName, jsDump;
  
  function quote( str ){
    return '"' + str.toString().replace(/"/g, '\\"') + '"';
  }
  
  function literal( o ){
    return o + '';  
  }
  
  function join( pre, arr, post ){
    var s     = jsDump.separator(),
        base  = jsDump.indent(),
        inner = jsDump.indent(1);
        
    if( arr.join )  arr = arr.join( ',' + s + inner );
    if( !arr ) return pre + post;
    
    return [ pre, inner + arr, base + post ].join(s);
  }
  
  function array( arr ){
    var i = arr.length, ret = new Array(i);         
    this.up();
    while( i-- ) ret[i] = this._parse( arr[i] );        
    this.down();
    return join( '[', ret, ']' );
  }
  
  reName = /^function (\w+)/;
  
  jsDump = CoreTest.jsDump = {

    parse: function(obj, type) {
      if (obj && obj.toString) {
        var toString = obj.toString;
        if ((toString !== Object.prototype.toString) && (toString !== Array.toString)) return obj.toString();
      }
      if (obj && obj.inspect) return obj.inspect();
      
      this.seen = [];
      var ret = this._parse(obj, type);
      this.seen = null;
      return ret ;
    },
    
    //type is used mostly internally, you can fix a (custom)type in advance
    _parse: function( obj, type ) {
      
      
      var parser = this.parsers[ type || this.typeOf(obj) ];
      type = typeof parser;     

      // avoid recursive loops
      if ((parser === this.parsers.object) && (this.seen.indexOf(obj)>=0)) {
        return '(recursive)';
      }
      this.seen.push(obj);
      
      return type == 'function' ? parser.call( this, obj ) :
           type == 'string' ? parser :
           this.parsers.error;
    },
    typeOf:function( obj ){
      var type = typeof obj,
        f = 'function';//we'll use it 3 times, save it
        
      if (obj && (obj.isObject || obj.isClass)) return 'scobj';
      return type != 'object' && type != f ? type :
        !obj ? 'null' :
        obj.exec ? 'regexp' :// some browsers (FF) consider regexps functions
        obj.getHours ? 'date' :
        obj.scrollBy ?  'window' :
        obj.nodeName == '#document' ? 'document' :
        obj.nodeName ? 'node' :
        obj.item ? 'nodelist' : // Safari reports nodelists as functions
        obj.callee ? 'arguments' :
        obj.call || obj.constructor != Array && //an array would also fall on this hack
          (obj+'').indexOf(f) != -1 ? f : //IE reports functions like alert, as objects
        'length' in obj ? 'array' :
        type;
    },
    separator:function(){
      return this.multiline ? this.HTML ? '<br />' : '\n' : this.HTML ? '&nbsp;' : ' ';
    },
    indent:function( extra ){// extra can be a number, shortcut for increasing-calling-decreasing
      if( !this.multiline ) return '';
      
      var chr = this.indentChar;
      if( this.HTML ) chr = chr.replace(/\t/g,'   ').replace(/ /g,'&nbsp;');
      return (new Array( this._depth_ + (extra||0) )).join(chr);
    },
    up:function( a ){
      this._depth_ += a || 1;
    },
    down:function( a ){
      this._depth_ -= a || 1;
    },
    setParser:function( name, parser ){
      this.parsers[name] = parser;
    },
    // The next 3 are exposed so you can use them
    quote:quote, 
    literal:literal,
    join:join,
    //
    _depth_: 1,
    // This is the list of parsers, to modify them, use jsDump.setParser
    parsers:{
      window: '[Window]',
      document: '[Document]',
      error:'[ERROR]', //when no parser is found, shouldn't happen
      unknown: '[Unknown]',
      'null':'null',
      'undefined':'undefined',
      'function':function( fn ){
        var ret = 'function',
          name = 'name' in fn ? fn.name : (reName.exec(fn)||[])[1];//functions never have name in IE
        if( name ) ret += ' ' + name;
        ret += '(';
        
        ret = [ ret, this._parse( fn, 'functionArgs' ), '){'].join('');
        return join( ret, this._parse(fn,'functionCode'), '}' );
      },
      array: array,
      nodelist: array,
      'arguments': array,
      scobj: function(obj) { return obj.toString(); },
      object:function( map ){
        
        var ret = [ ];
        this.up();
        for( var key in map ) {
          ret.push( this._parse(key,'key') + ': ' + this._parse(map[key]) );
        }
        this.down();
        return join( '{', ret, '}' );
      },
      node:function( node ){
        var open = this.HTML ? '&lt;' : '<',
          close = this.HTML ? '&gt;' : '>';
          
        var tag = node.nodeName.toLowerCase(),
          ret = open + tag;
          
        for( var a in this.DOMAttrs ){
          var val = node[this.DOMAttrs[a]];
          if( val ) {
            ret += ' ' + a + '=' + this._parse( val, 'attribute' );
          }
        }
        return ret + close + open + '/' + tag + close;
      },
      functionArgs:function( fn ){//function calls it internally, it's the arguments part of the function
        var l = fn.length;
        if( !l ) return '';       
        
        var args = new Array(l);
        while( l-- ) args[l] = String.fromCharCode(97+l);//97 is 'a'
        return ' ' + args.join(', ') + ' ';
      },
      key:quote, //object calls it internally, the key part of an item in a map
      functionCode:'[code]', //function calls it internally, it's the content of the function
      attribute:quote, //node calls it internally, it's an html attribute value
      string:quote,
      date:quote,
      regexp:literal, //regex
      number:literal,
      'boolean':literal
    },
    DOMAttrs:{//attributes to dump from nodes, name=>realName
      id:'id',
      name:'name',
      'class':'className'
    },
    HTML:true,//if true, entities are escaped ( <, >, \t, space and \n )
    indentChar:'   ',//indentation unit
    multiline:true //if true, items in a collection, are separated by a \n, else just a space.
  };
  
  CoreTest.dump = function dump(obj,type) {
    return CoreTest.jsDump.parse(obj, type);
  };

})();
