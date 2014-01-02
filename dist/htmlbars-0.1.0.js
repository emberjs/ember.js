(function(global) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen.hasOwnProperty(name)) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };

  requireModule.registry = registry;
})();


define(
  'handlebars/safe-string',["exports"],
  function(__exports__) {
    
    // Build out our basic SafeString type
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = function() {
      return "" + this.string;
    };

    __exports__['default'] = SafeString;
  });
define(
  'handlebars/utils',["./safe-string","exports"],
  function(__dependency1__, __exports__) {
    
    var SafeString = __dependency1__['default'];

    var isArray = Array.isArray;

    var escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    function escapeChar(chr) {
      return escape[chr] || "&amp;";
    }

    function extend(obj, value) {
      for(var key in value) {
        if(value.hasOwnProperty(key)) {
          obj[key] = value[key];
        }
      }
    }

    __exports__.extend = extend;function escapeExpression(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof SafeString) {
        return string.toString();
      } else if (!string && string !== 0) {
        return "";
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = "" + string;

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    }

    __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    __exports__.isEmpty = isEmpty;
  });
define(
  'handlebars/exception',["exports"],
  function(__exports__) {
    

    var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

    function Exception(/* message */) {
      var tmp = Error.prototype.constructor.apply(this, arguments);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = tmp[errorProps[idx]];
      }
    }

    Exception.prototype = new Error();

    __exports__['default'] = Exception;
  });
define(
  'handlebars/base',["./utils","./exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /*jshint eqnull: true */

    var extend = __dependency1__.extend;
    var isEmpty = __dependency1__.isEmpty;
    var Exception = __dependency2__['default'];

    var VERSION = "1.0.0";
    __exports__.VERSION = VERSION;var COMPILER_REVISION = 4;
    __exports__.COMPILER_REVISION = COMPILER_REVISION;
    var REVISION_CHANGES = {
      1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
      2: '== 1.0.0-rc.3',
      3: '== 1.0.0-rc.4',
      4: '>= 1.0.0'
    };
    __exports__.REVISION_CHANGES = REVISION_CHANGES;
    var toString = Object.prototype.toString,
        objectType = '[object Object]';

    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    var isFunction = function(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }

    function isArray(value) {
      return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
    }

    function HandlebarsEnvironment(helpers, partials) {
      this.helpers = helpers || {};
      this.partials = partials || {};

      registerDefaultHelpers(this);
    }

    __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
      constructor: HandlebarsEnvironment,

      logger: logger,
      log: log,

      registerHelper: function(name, fn, inverse) {
        if (toString.call(name) === objectType) {
          if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
          extend(this.helpers, name);
        } else {
          if (inverse) { fn.not = inverse; }
          this.helpers[name] = fn;
        }
      },

      registerPartial: function(name, str) {
        if (toString.call(name) === objectType) {
          extend(this.partials,  name);
        } else {
          this.partials[name] = str;
        }
      }
    };

    function registerDefaultHelpers(instance) {
      instance.registerHelper('helperMissing', function(arg) {
        if(arguments.length === 2) {
          return undefined;
        } else {
          throw new Error("Missing helper: '" + arg + "'");
        }
      });

      instance.registerHelper('blockHelperMissing', function(context, options) {
        var inverse = options.inverse || function() {}, fn = options.fn;

        if (isFunction(context)) { context = context.call(this); }

        if(context === true) {
          return fn(this);
        } else if(context === false || context == null) {
          return inverse(this);
        } else if (isArray(context)) {
          if(context.length > 0) {
            return instance.helpers.each(context, options);
          } else {
            return inverse(this);
          }
        } else {
          return fn(context);
        }
      });

      instance.registerHelper('each', function(context, options) {
        var fn = options.fn, inverse = options.inverse;
        var i = 0, ret = "", data;

        if (isFunction(context)) { context = context.call(this); }

        if (options.data) {
          data = createFrame(options.data);
        }

        if(context && typeof context === 'object') {
          if (isArray(context)) {
            for(var j = context.length; i<j; i++) {
              if (data) { data.index = i; }
              ret = ret + fn(context[i], { data: data });
            }
          } else {
            for(var key in context) {
              if(context.hasOwnProperty(key)) {
                if(data) { data.key = key; }
                ret = ret + fn(context[key], {data: data});
                i++;
              }
            }
          }
        }

        if(i === 0){
          ret = inverse(this);
        }

        return ret;
      });

      instance.registerHelper('if', function(conditional, options) {
        if (isFunction(conditional)) { conditional = conditional.call(this); }

        if (isEmpty(conditional)) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      });

      instance.registerHelper('unless', function(conditional, options) {
        return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
      });

      instance.registerHelper('with', function(context, options) {
        if (isFunction(context)) { context = context.call(this); }

        if (!isEmpty(context)) return options.fn(context);
      });

      instance.registerHelper('log', function(context, options) {
        var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
        instance.log(level, context);
      });
    }

    var levels = {
      DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3
    };

    var methodMap = { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' };

    var logger = {
      // can be overridden in the host environment
      log: function(level, obj) {
        if (logger.level <= level) {
          var method = logger.methodMap[level];
          if (typeof console !== 'undefined' && console[method]) {
            console[method].call(console, obj);
          }
        }
      }
    };
    __exports__.logger = logger;
    function log(level, obj) { logger.log(level, obj); }

    __exports__.log = log;var createFrame = function(object) {
      var obj = {};
      extend(obj, object);
      return obj;
    };
    __exports__.createFrame = createFrame;
  });
define(
  'handlebars/runtime',["./exception","./utils","./base","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var Exception = __dependency1__['default'];
    var escapeExpression = __dependency2__.escapeExpression;
    var extend = __dependency2__.extend;
    var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;

    function checkRevision(compilerInfo) {
      var compilerRevision = compilerInfo && compilerInfo[0] || 1,
          currentRevision = COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = REVISION_CHANGES[currentRevision],
              compilerVersions = REVISION_CHANGES[compilerRevision];
          throw new Error("Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw new Error("Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").");
        }
      }
    }

    // TODO: Remove this line and break up compilePartial

    function template(templateSpec, env) {
      if (!env) {
        throw new Error("No environment passed to template");
      }

      var invokePartialWrapper;
      if (env.compile) {
        invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
          // TODO : Check this for all inputs and the options handling (partial flag, etc). This feels
          // like there should be a common exec path
          var result = invokePartial.apply(this, arguments);
          if (result) { return result; }

          var options = { helpers: helpers, partials: partials, data: data };
          partials[name] = env.compile(partial, { data: data !== undefined }, env);
          return partials[name](context, options);
        };
      } else {
        invokePartialWrapper = function(partial, name /* , context, helpers, partials, data */) {
          var result = invokePartial.apply(this, arguments);
          if (result) { return result; }
          throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
        };
      }

      // Just add water
      var container = {
        escapeExpression: escapeExpression,
        invokePartial: invokePartialWrapper,
        programs: [],
        program: function(i, fn, data) {
          var programWrapper = this.programs[i];
          if(data) {
            programWrapper = program(i, fn, data);
          } else if (!programWrapper) {
            programWrapper = this.programs[i] = program(i, fn);
          }
          return programWrapper;
        },
        merge: function(param, common) {
          var ret = param || common;

          if (param && common && (param !== common)) {
            ret = {};
            extend(ret, common);
            extend(ret, param);
          }
          return ret;
        },
        programWithDepth: programWithDepth,
        noop: noop,
        compilerInfo: null
      };

      return function(context, options) {
        options = options || {};
        var namespace = options.partial ? options : env,
            helpers,
            partials;

        if (!options.partial) {
          helpers = options.helpers;
          partials = options.partials;
        }
        var result = templateSpec.call(
              container,
              namespace, context,
              helpers,
              partials,
              options.data);

        if (!options.partial) {
          checkRevision(container.compilerInfo);
        }

        return result;
      };
    }

    __exports__.template = template;function programWithDepth(i, fn, data /*, $depth */) {
      var args = Array.prototype.slice.call(arguments, 3);

      var prog = function(context, options) {
        options = options || {};

        return fn.apply(this, [context, options.data || data].concat(args));
      };
      prog.program = i;
      prog.depth = args.length;
      return prog;
    }

    __exports__.programWithDepth = programWithDepth;function program(i, fn, data) {
      var prog = function(context, options) {
        options = options || {};

        return fn(context, options.data || data);
      };
      prog.program = i;
      prog.depth = 0;
      return prog;
    }

    __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
      var options = { partial: true, helpers: helpers, partials: partials, data: data };

      if(partial === undefined) {
        throw new Exception("The partial " + name + " could not be found");
      } else if(partial instanceof Function) {
        return partial(context, options);
      }
    }

    __exports__.invokePartial = invokePartial;function noop() { return ""; }

    __exports__.noop = noop;
  });
define(
  'handlebars.runtime',["./handlebars/base","./handlebars/safe-string","./handlebars/exception","./handlebars/utils","./handlebars/runtime","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    var base = __dependency1__;

    // Each of these augment the Handlebars object. No need to setup here.
    // (This is done to easily share code between commonjs and browse envs)
    var SafeString = __dependency2__['default'];
    var Exception = __dependency3__['default'];
    var Utils = __dependency4__;
    var runtime = __dependency5__;

    // For compatibility and usage outside of module systems, make the Handlebars object a namespace
    var create = function() {
      var hb = new base.HandlebarsEnvironment();

      Utils.extend(hb, base);
      hb.SafeString = SafeString;
      hb.Exception = Exception;
      hb.Utils = Utils;

      hb.VM = runtime;
      hb.template = function(spec) {
        return runtime.template(spec, hb);
      };

      return hb;
    };

    var Handlebars = create();
    Handlebars.create = create;

    __exports__['default'] = Handlebars;
  });
define(
  'handlebars/compiler/ast',["../exception","exports"],
  function(__dependency1__, __exports__) {
    
    var Exception = __dependency1__['default'];

    function ProgramNode(statements, inverse) {
      this.type = "program";
      this.statements = statements;
      if(inverse) { this.inverse = new ProgramNode(inverse); }
    }

    __exports__.ProgramNode = ProgramNode;function MustacheNode(rawParams, hash, unescaped) {
      this.type = "mustache";
      this.escaped = !unescaped;
      this.hash = hash;

      var id = this.id = rawParams[0];
      var params = this.params = rawParams.slice(1);

      // a mustache is an eligible helper if:
      // * its id is simple (a single part, not `this` or `..`)
      var eligibleHelper = this.eligibleHelper = id.isSimple;

      // a mustache is definitely a helper if:
      // * it is an eligible helper, and
      // * it has at least one parameter or hash segment
      this.isHelper = eligibleHelper && (params.length || hash);

      // if a mustache is an eligible helper but not a definite
      // helper, it is ambiguous, and will be resolved in a later
      // pass or at runtime.
    }

    __exports__.MustacheNode = MustacheNode;function PartialNode(partialName, context) {
      this.type         = "partial";
      this.partialName  = partialName;
      this.context      = context;
    }

    __exports__.PartialNode = PartialNode;function BlockNode(mustache, program, inverse, close) {
      if(mustache.id.original !== close.original) {
        throw new Exception(mustache.id.original + " doesn't match " + close.original);
      }

      this.type = "block";
      this.mustache = mustache;
      this.program  = program;
      this.inverse  = inverse;

      if (this.inverse && !this.program) {
        this.isInverse = true;
      }
    }

    __exports__.BlockNode = BlockNode;function ContentNode(string) {
      this.type = "content";
      this.string = string;
    }

    __exports__.ContentNode = ContentNode;function HashNode(pairs) {
      this.type = "hash";
      this.pairs = pairs;
    }

    __exports__.HashNode = HashNode;function IdNode(parts) {
      this.type = "ID";

      var original = "",
          dig = [],
          depth = 0;

      for(var i=0,l=parts.length; i<l; i++) {
        var part = parts[i].part;
        original += (parts[i].separator || '') + part;

        if (part === ".." || part === "." || part === "this") {
          if (dig.length > 0) { throw new Exception("Invalid path: " + original); }
          else if (part === "..") { depth++; }
          else { this.isScoped = true; }
        }
        else { dig.push(part); }
      }

      this.original = original;
      this.parts    = dig;
      this.string   = dig.join('.');
      this.depth    = depth;

      // an ID is simple if it only has one part, and that part is not
      // `..` or `this`.
      this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

      this.stringModeValue = this.string;
    }

    __exports__.IdNode = IdNode;function PartialNameNode(name) {
      this.type = "PARTIAL_NAME";
      this.name = name.original;
    }

    __exports__.PartialNameNode = PartialNameNode;function DataNode(id) {
      this.type = "DATA";
      this.id = id;
    }

    __exports__.DataNode = DataNode;function StringNode(string) {
      this.type = "STRING";
      this.original =
        this.string =
        this.stringModeValue = string;
    }

    __exports__.StringNode = StringNode;function IntegerNode(integer) {
      this.type = "INTEGER";
      this.original =
        this.integer = integer;
      this.stringModeValue = Number(integer);
    }

    __exports__.IntegerNode = IntegerNode;function BooleanNode(bool) {
      this.type = "BOOLEAN";
      this.bool = bool;
      this.stringModeValue = bool === "true";
    }

    __exports__.BooleanNode = BooleanNode;function CommentNode(comment) {
      this.type = "comment";
      this.comment = comment;
    }

    __exports__.CommentNode = CommentNode;
  });
define(
  'handlebars/compiler/parser',["exports"],
  function(__exports__) {
    
    /* Jison generated parser */
    var handlebars = (function(){
    var parser = {trace: function trace() { },
    yy: {},
    symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"partial_option0":27,"inMustache_repetition0":28,"inMustache_option0":29,"dataName":30,"param":31,"STRING":32,"INTEGER":33,"BOOLEAN":34,"hash":35,"hash_repetition_plus0":36,"hashSegment":37,"ID":38,"EQUALS":39,"DATA":40,"pathSegments":41,"SEP":42,"$accept":0,"$end":1},
    terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",38:"ID",39:"EQUALS",40:"DATA",42:"SEP"},
    productions_: [0,[3,2],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[35,1],[37,3],[26,1],[26,1],[26,1],[30,2],[21,1],[41,3],[41,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[36,1],[36,2]],
    performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

    var $0 = $$.length - 1;
    switch (yystate) {
    case 1: return new yy.ProgramNode($$[$0-1]); 
    break;
    case 2:this.$ = new yy.ProgramNode([], $$[$0]);
    break;
    case 3:this.$ = new yy.ProgramNode($$[$0-2], $$[$0]);
    break;
    case 4:this.$ = new yy.ProgramNode($$[$0-1], []);
    break;
    case 5:this.$ = new yy.ProgramNode($$[$0]);
    break;
    case 6:this.$ = new yy.ProgramNode([]);
    break;
    case 7:this.$ = new yy.ProgramNode([]);
    break;
    case 8:this.$ = [$$[$0]];
    break;
    case 9: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
    break;
    case 10:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]);
    break;
    case 11:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]);
    break;
    case 12:this.$ = $$[$0];
    break;
    case 13:this.$ = $$[$0];
    break;
    case 14:this.$ = new yy.ContentNode($$[$0]);
    break;
    case 15:this.$ = new yy.CommentNode($$[$0]);
    break;
    case 16:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]);
    break;
    case 17:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]);
    break;
    case 18:this.$ = $$[$0-1];
    break;
    case 19:
        // Parsing out the '&' escape token at this level saves ~500 bytes after min due to the removal of one parser node.
        this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2][2] === '&');
      
    break;
    case 20:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], true);
    break;
    case 21:this.$ = new yy.PartialNode($$[$0-2], $$[$0-1]);
    break;
    case 22: 
    break;
    case 23:this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]];
    break;
    case 24:this.$ = [[$$[$0]], null];
    break;
    case 25:this.$ = $$[$0];
    break;
    case 26:this.$ = new yy.StringNode($$[$0]);
    break;
    case 27:this.$ = new yy.IntegerNode($$[$0]);
    break;
    case 28:this.$ = new yy.BooleanNode($$[$0]);
    break;
    case 29:this.$ = $$[$0];
    break;
    case 30:this.$ = new yy.HashNode($$[$0]);
    break;
    case 31:this.$ = [$$[$0-2], $$[$0]];
    break;
    case 32:this.$ = new yy.PartialNameNode($$[$0]);
    break;
    case 33:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0]));
    break;
    case 34:this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0]));
    break;
    case 35:this.$ = new yy.DataNode($$[$0]);
    break;
    case 36:this.$ = new yy.IdNode($$[$0]);
    break;
    case 37: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
    break;
    case 38:this.$ = [{part: $$[$0]}];
    break;
    case 41:this.$ = [];
    break;
    case 42:$$[$0-1].push($$[$0]);
    break;
    case 45:this.$ = [$$[$0]];
    break;
    case 46:$$[$0-1].push($$[$0]);
    break;
    }
    },
    table: [{3:1,4:2,8:3,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],22:[1,12],23:[1,13],25:[1,14]},{1:[3]},{5:[1,15],8:16,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],22:[1,12],23:[1,13],25:[1,14]},{5:[2,8],14:[2,8],15:[2,8],16:[2,8],19:[2,8],20:[2,8],22:[2,8],23:[2,8],25:[2,8]},{4:19,6:17,7:18,8:3,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,20],20:[2,7],22:[1,12],23:[1,13],25:[1,14]},{4:19,6:21,7:18,8:3,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,20],20:[2,7],22:[1,12],23:[1,13],25:[1,14]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{17:22,21:23,30:24,38:[1,27],40:[1,26],41:25},{17:28,21:23,30:24,38:[1,27],40:[1,26],41:25},{17:29,21:23,30:24,38:[1,27],40:[1,26],41:25},{17:30,21:23,30:24,38:[1,27],40:[1,26],41:25},{21:32,26:31,32:[1,33],33:[1,34],38:[1,27],41:25},{1:[2,1]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{10:35,20:[1,36]},{4:37,8:3,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],20:[2,6],22:[1,12],23:[1,13],25:[1,14]},{7:38,8:16,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,20],20:[2,5],22:[1,12],23:[1,13],25:[1,14]},{17:22,18:[1,39],21:23,30:24,38:[1,27],40:[1,26],41:25},{10:40,20:[1,36]},{18:[1,41]},{18:[2,41],24:[2,41],28:42,32:[2,41],33:[2,41],34:[2,41],38:[2,41],40:[2,41]},{18:[2,24],24:[2,24]},{18:[2,36],24:[2,36],32:[2,36],33:[2,36],34:[2,36],38:[2,36],40:[2,36],42:[1,43]},{21:44,38:[1,27],41:25},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],38:[2,38],40:[2,38],42:[2,38]},{18:[1,45]},{18:[1,46]},{24:[1,47]},{18:[2,39],21:49,27:48,38:[1,27],41:25},{18:[2,32],38:[2,32]},{18:[2,33],38:[2,33]},{18:[2,34],38:[2,34]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{21:50,38:[1,27],41:25},{8:16,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],20:[2,2],22:[1,12],23:[1,13],25:[1,14]},{4:51,8:3,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],20:[2,4],22:[1,12],23:[1,13],25:[1,14]},{14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{18:[2,43],21:55,24:[2,43],29:52,30:59,31:53,32:[1,56],33:[1,57],34:[1,58],35:54,36:60,37:61,38:[1,62],40:[1,26],41:25},{38:[1,63]},{18:[2,35],24:[2,35],32:[2,35],33:[2,35],34:[2,35],38:[2,35],40:[2,35]},{14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{18:[1,64]},{18:[2,40]},{18:[1,65]},{8:16,9:4,11:5,12:6,13:7,14:[1,8],15:[1,9],16:[1,11],19:[1,10],20:[2,3],22:[1,12],23:[1,13],25:[1,14]},{18:[2,23],24:[2,23]},{18:[2,42],24:[2,42],32:[2,42],33:[2,42],34:[2,42],38:[2,42],40:[2,42]},{18:[2,44],24:[2,44]},{18:[2,25],24:[2,25],32:[2,25],33:[2,25],34:[2,25],38:[2,25],40:[2,25]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],38:[2,26],40:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],38:[2,27],40:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],38:[2,28],40:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],38:[2,29],40:[2,29]},{18:[2,30],24:[2,30],37:66,38:[1,67]},{18:[2,45],24:[2,45],38:[2,45]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],38:[2,38],39:[1,68],40:[2,38],42:[2,38]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],38:[2,37],40:[2,37],42:[2,37]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{5:[2,18],14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,46],24:[2,46],38:[2,46]},{39:[1,68]},{21:55,30:59,31:69,32:[1,56],33:[1,57],34:[1,58],38:[1,27],40:[1,26],41:25},{18:[2,31],24:[2,31],38:[2,31]}],
    defaultActions: {15:[2,1],49:[2,40]},
    parseError: function parseError(str, hash) {
        throw new Error(str);
    },
    parse: function parse(input) {
        var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined")
            this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function")
            this.parseError = this.yy.parseError;
        function popStack(n) {
            stack.length = stack.length - 2 * n;
            vstack.length = vstack.length - n;
            lstack.length = lstack.length - n;
        }
        function lex() {
            var token;
            token = self.lexer.lex() || 1;
            if (typeof token !== "number") {
                token = self.symbols_[token] || token;
            }
            return token;
        }
        var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
        while (true) {
            state = stack[stack.length - 1];
            if (this.defaultActions[state]) {
                action = this.defaultActions[state];
            } else {
                if (symbol === null || typeof symbol == "undefined") {
                    symbol = lex();
                }
                action = table[state] && table[state][symbol];
            }
            if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                if (!recovering) {
                    expected = [];
                    for (p in table[state])
                        if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                    if (this.lexer.showPosition) {
                        errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                    } else {
                        errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                    }
                    this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
                }
            }
            if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
            }
            switch (action[0]) {
            case 1:
                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]);
                symbol = null;
                if (!preErrorSymbol) {
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else {
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;
            case 2:
                len = this.productions_[action[1]][1];
                yyval.$ = vstack[vstack.length - len];
                yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
                if (ranges) {
                    yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                }
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                if (typeof r !== "undefined") {
                    return r;
                }
                if (len) {
                    stack = stack.slice(0, -1 * len * 2);
                    vstack = vstack.slice(0, -1 * len);
                    lstack = lstack.slice(0, -1 * len);
                }
                stack.push(this.productions_[action[1]][0]);
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                stack.push(newState);
                break;
            case 3:
                return true;
            }
        }
        return true;
    }
    };
    /* Jison generated lexer */
    var lexer = (function(){
    var lexer = ({EOF:1,
    parseError:function parseError(str, hash) {
            if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
            } else {
                throw new Error(str);
            }
        },
    setInput:function (input) {
            this._input = input;
            this._more = this._less = this.done = false;
            this.yylineno = this.yyleng = 0;
            this.yytext = this.matched = this.match = '';
            this.conditionStack = ['INITIAL'];
            this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
            if (this.options.ranges) this.yylloc.range = [0,0];
            this.offset = 0;
            return this;
        },
    input:function () {
            var ch = this._input[0];
            this.yytext += ch;
            this.yyleng++;
            this.offset++;
            this.match += ch;
            this.matched += ch;
            var lines = ch.match(/(?:\r\n?|\n).*/g);
            if (lines) {
                this.yylineno++;
                this.yylloc.last_line++;
            } else {
                this.yylloc.last_column++;
            }
            if (this.options.ranges) this.yylloc.range[1]++;

            this._input = this._input.slice(1);
            return ch;
        },
    unput:function (ch) {
            var len = ch.length;
            var lines = ch.split(/(?:\r\n?|\n)/g);

            this._input = ch + this._input;
            this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
            //this.yyleng -= len;
            this.offset -= len;
            var oldLines = this.match.split(/(?:\r\n?|\n)/g);
            this.match = this.match.substr(0, this.match.length-1);
            this.matched = this.matched.substr(0, this.matched.length-1);

            if (lines.length-1) this.yylineno -= lines.length-1;
            var r = this.yylloc.range;

            this.yylloc = {first_line: this.yylloc.first_line,
              last_line: this.yylineno+1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
                  this.yylloc.first_column - len
              };

            if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
            }
            return this;
        },
    more:function () {
            this._more = true;
            return this;
        },
    less:function (n) {
            this.unput(this.match.slice(n));
        },
    pastInput:function () {
            var past = this.matched.substr(0, this.matched.length - this.match.length);
            return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
        },
    upcomingInput:function () {
            var next = this.match;
            if (next.length < 20) {
                next += this._input.substr(0, 20-next.length);
            }
            return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
        },
    showPosition:function () {
            var pre = this.pastInput();
            var c = new Array(pre.length + 1).join("-");
            return pre + this.upcomingInput() + "\n" + c+"^";
        },
    next:function () {
            if (this.done) {
                return this.EOF;
            }
            if (!this._input) this.done = true;

            var token,
                match,
                tempMatch,
                index,
                col,
                lines;
            if (!this._more) {
                this.yytext = '';
                this.match = '';
            }
            var rules = this._currentRules();
            for (var i=0;i < rules.length; i++) {
                tempMatch = this._input.match(this.rules[rules[i]]);
                if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                    match = tempMatch;
                    index = i;
                    if (!this.options.flex) break;
                }
            }
            if (match) {
                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
                if (this.done && this._input) this.done = false;
                if (token) return token;
                else return;
            }
            if (this._input === "") {
                return this.EOF;
            } else {
                return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                        {text: "", token: null, line: this.yylineno});
            }
        },
    lex:function lex() {
            var r = this.next();
            if (typeof r !== 'undefined') {
                return r;
            } else {
                return this.lex();
            }
        },
    begin:function begin(condition) {
            this.conditionStack.push(condition);
        },
    popState:function popState() {
            return this.conditionStack.pop();
        },
    _currentRules:function _currentRules() {
            return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
        },
    topState:function () {
            return this.conditionStack[this.conditionStack.length-2];
        },
    pushState:function begin(condition) {
            this.begin(condition);
        }});
    lexer.options = {};
    lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


    function strip(start, end) {
      return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
    }


    var YYSTATE=YY_START
    switch($avoiding_name_collisions) {
    case 0:yy_.yytext = "\\"; return 14;
    break;
    case 1:
                                       if(yy_.yytext.slice(-1) !== "\\") this.begin("mu");
                                       if(yy_.yytext.slice(-1) === "\\") strip(0,1), this.begin("emu");
                                       if(yy_.yytext) return 14;
                                     
    break;
    case 2:return 14;
    break;
    case 3:
                                       if(yy_.yytext.slice(-1) !== "\\") this.popState();
                                       if(yy_.yytext.slice(-1) === "\\") strip(0,1);
                                       return 14;
                                     
    break;
    case 4:strip(0,4); this.popState(); return 15;
    break;
    case 5:return 25;
    break;
    case 6:return 16;
    break;
    case 7:return 20;
    break;
    case 8:return 19;
    break;
    case 9:return 19;
    break;
    case 10:return 23;
    break;
    case 11:return 22;
    break;
    case 12:this.popState(); this.begin('com');
    break;
    case 13:strip(3,5); this.popState(); return 15;
    break;
    case 14:return 22;
    break;
    case 15:return 39;
    break;
    case 16:return 38;
    break;
    case 17:return 38;
    break;
    case 18:return 42;
    break;
    case 19:/*ignore whitespace*/
    break;
    case 20:this.popState(); return 24;
    break;
    case 21:this.popState(); return 18;
    break;
    case 22:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 32;
    break;
    case 23:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 32;
    break;
    case 24:return 40;
    break;
    case 25:return 34;
    break;
    case 26:return 34;
    break;
    case 27:return 33;
    break;
    case 28:return 38;
    break;
    case 29:yy_.yytext = strip(1,2); return 38;
    break;
    case 30:return 'INVALID';
    break;
    case 31:return 5;
    break;
    }
    };
    lexer.rules = [/^(?:\\\\(?=(\{\{)))/,/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\{\{>)/,/^(?:\{\{#)/,/^(?:\{\{\/)/,/^(?:\{\{\^)/,/^(?:\{\{\s*else\b)/,/^(?:\{\{\{)/,/^(?:\{\{&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{)/,/^(?:=)/,/^(?:\.(?=[}\/ ]))/,/^(?:\.\.)/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}\}\})/,/^(?:\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=[}\s]))/,/^(?:false(?=[}\s]))/,/^(?:-?[0-9]+(?=[}\s]))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
    lexer.conditions = {"mu":{"rules":[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"inclusive":false},"emu":{"rules":[3],"inclusive":false},"com":{"rules":[4],"inclusive":false},"INITIAL":{"rules":[0,1,2,31],"inclusive":true}};
    return lexer;})()
    parser.lexer = lexer;
    function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser;
    })();__exports__['default'] = handlebars;
  });
define(
  'handlebars/compiler/base',["./parser","./ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var parser = __dependency1__['default'];
    var AST = __dependency2__;

    __exports__.parser = parser;

    function parse(input) {
      // Just return if an already-compile AST was passed in.
      if(input.constructor === AST.ProgramNode) { return input; }

      parser.yy = AST;
      return parser.parse(input);
    }

    __exports__.parse = parse;
  });
define(
  'handlebars/compiler/javascript-compiler',["../base","exports"],
  function(__dependency1__, __exports__) {
    
    var COMPILER_REVISION = __dependency1__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency1__.REVISION_CHANGES;
    var log = __dependency1__.log;

    function Literal(value) {
      this.value = value;
    }

    function JavaScriptCompiler() {}

    JavaScriptCompiler.prototype = {
      // PUBLIC API: You can override these methods in a subclass to provide
      // alternative compiled forms for name lookup and buffering semantics
      nameLookup: function(parent, name /* , type*/) {
        if (/^[0-9]+$/.test(name)) {
          return parent + "[" + name + "]";
        } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
          return parent + "." + name;
        }
        else {
          return parent + "['" + name + "']";
        }
      },

      appendToBuffer: function(string) {
        if (this.environment.isSimple) {
          return "return " + string + ";";
        } else {
          return {
            appendToBuffer: true,
            content: string,
            toString: function() { return "buffer += " + string + ";"; }
          };
        }
      },

      initializeBuffer: function() {
        return this.quotedString("");
      },

      namespace: "Handlebars",
      // END PUBLIC API

      compile: function(environment, options, context, asObject) {
        this.environment = environment;
        this.options = options || {};

        log('debug', this.environment.disassemble() + "\n\n");

        this.name = this.environment.name;
        this.isChild = !!context;
        this.context = context || {
          programs: [],
          environments: [],
          aliases: { }
        };

        this.preamble();

        this.stackSlot = 0;
        this.stackVars = [];
        this.registers = { list: [] };
        this.compileStack = [];
        this.inlineStack = [];

        this.compileChildren(environment, options);

        var opcodes = environment.opcodes, opcode;

        this.i = 0;

        for(var l=opcodes.length; this.i<l; this.i++) {
          opcode = opcodes[this.i];

          if(opcode.opcode === 'DECLARE') {
            this[opcode.name] = opcode.value;
          } else {
            this[opcode.opcode].apply(this, opcode.args);
          }
        }

        return this.createFunctionContext(asObject);
      },

      nextOpcode: function() {
        var opcodes = this.environment.opcodes;
        return opcodes[this.i + 1];
      },

      eat: function() {
        this.i = this.i + 1;
      },

      preamble: function() {
        var out = [];

        if (!this.isChild) {
          var namespace = this.namespace;

          var copies = "helpers = this.merge(helpers, " + namespace + ".helpers);";
          if (this.environment.usePartial) { copies = copies + " partials = this.merge(partials, " + namespace + ".partials);"; }
          if (this.options.data) { copies = copies + " data = data || {};"; }
          out.push(copies);
        } else {
          out.push('');
        }

        if (!this.environment.isSimple) {
          out.push(", buffer = " + this.initializeBuffer());
        } else {
          out.push("");
        }

        // track the last context pushed into place to allow skipping the
        // getContext opcode when it would be a noop
        this.lastContext = 0;
        this.source = out;
      },

      createFunctionContext: function(asObject) {
        var locals = this.stackVars.concat(this.registers.list);

        if(locals.length > 0) {
          this.source[1] = this.source[1] + ", " + locals.join(", ");
        }

        // Generate minimizer alias mappings
        if (!this.isChild) {
          for (var alias in this.context.aliases) {
            if (this.context.aliases.hasOwnProperty(alias)) {
              this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
            }
          }
        }

        if (this.source[1]) {
          this.source[1] = "var " + this.source[1].substring(2) + ";";
        }

        // Merge children
        if (!this.isChild) {
          this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
        }

        if (!this.environment.isSimple) {
          this.source.push("return buffer;");
        }

        var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

        for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
          params.push("depth" + this.environment.depths.list[i]);
        }

        // Perform a second pass over the output to merge content when possible
        var source = this.mergeSource();

        if (!this.isChild) {
          var revision = COMPILER_REVISION,
              versions = REVISION_CHANGES[revision];
          source = "this.compilerInfo = ["+revision+",'"+versions+"'];\n"+source;
        }

        if (asObject) {
          params.push(source);

          return Function.apply(this, params);
        } else {
          var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
          log('debug', functionSource + "\n\n");
          return functionSource;
        }
      },
      mergeSource: function() {
        // WARN: We are not handling the case where buffer is still populated as the source should
        // not have buffer append operations as their final action.
        var source = '',
            buffer;
        for (var i = 0, len = this.source.length; i < len; i++) {
          var line = this.source[i];
          if (line.appendToBuffer) {
            if (buffer) {
              buffer = buffer + '\n    + ' + line.content;
            } else {
              buffer = line.content;
            }
          } else {
            if (buffer) {
              source += 'buffer += ' + buffer + ';\n  ';
              buffer = undefined;
            }
            source += line + '\n  ';
          }
        }
        return source;
      },

      // [blockValue]
      //
      // On stack, before: hash, inverse, program, value
      // On stack, after: return value of blockHelperMissing
      //
      // The purpose of this opcode is to take a block of the form
      // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
      // replace it on the stack with the result of properly
      // invoking blockHelperMissing.
      blockValue: function() {
        this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(0, params);

        this.replaceStack(function(current) {
          params.splice(1, 0, current);
          return "blockHelperMissing.call(" + params.join(", ") + ")";
        });
      },

      // [ambiguousBlockValue]
      //
      // On stack, before: hash, inverse, program, value
      // Compiler value, before: lastHelper=value of last found helper, if any
      // On stack, after, if no lastHelper: same as [blockValue]
      // On stack, after, if lastHelper: value
      ambiguousBlockValue: function() {
        this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(0, params);

        var current = this.topStack();
        params.splice(1, 0, current);

        // Use the options value generated from the invocation
        params[params.length-1] = 'options';

        this.source.push("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
      },

      // [appendContent]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Appends the string value of `content` to the current buffer
      appendContent: function(content) {
        this.source.push(this.appendToBuffer(this.quotedString(content)));
      },

      // [append]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Coerces `value` to a String and appends it to the current buffer.
      //
      // If `value` is truthy, or 0, it is coerced into a string and appended
      // Otherwise, the empty string is appended
      append: function() {
        // Force anything that is inlined onto the stack so we don't have duplication
        // when we examine local
        this.flushInline();
        var local = this.popStack();
        this.source.push("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
        if (this.environment.isSimple) {
          this.source.push("else { " + this.appendToBuffer("''") + " }");
        }
      },

      // [appendEscaped]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Escape `value` and append it to the buffer
      appendEscaped: function() {
        this.context.aliases.escapeExpression = 'this.escapeExpression';

        this.source.push(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
      },

      // [getContext]
      //
      // On stack, before: ...
      // On stack, after: ...
      // Compiler value, after: lastContext=depth
      //
      // Set the value of the `lastContext` compiler value to the depth
      getContext: function(depth) {
        if(this.lastContext !== depth) {
          this.lastContext = depth;
        }
      },

      // [lookupOnContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext[name], ...
      //
      // Looks up the value of `name` on the current context and pushes
      // it onto the stack.
      lookupOnContext: function(name) {
        this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
      },

      // [pushContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext, ...
      //
      // Pushes the value of the current context onto the stack.
      pushContext: function() {
        this.pushStackLiteral('depth' + this.lastContext);
      },

      // [resolvePossibleLambda]
      //
      // On stack, before: value, ...
      // On stack, after: resolved value, ...
      //
      // If the `value` is a lambda, replace it on the stack by
      // the return value of the lambda
      resolvePossibleLambda: function() {
        this.context.aliases.functionType = '"function"';

        this.replaceStack(function(current) {
          return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
        });
      },

      // [lookup]
      //
      // On stack, before: value, ...
      // On stack, after: value[name], ...
      //
      // Replace the value on the stack with the result of looking
      // up `name` on `value`
      lookup: function(name) {
        this.replaceStack(function(current) {
          return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
        });
      },

      // [lookupData]
      //
      // On stack, before: ...
      // On stack, after: data, ...
      //
      // Push the data lookup operator
      lookupData: function() {
        this.push('data');
      },

      // [pushStringParam]
      //
      // On stack, before: ...
      // On stack, after: string, currentContext, ...
      //
      // This opcode is designed for use in string mode, which
      // provides the string value of a parameter along with its
      // depth rather than resolving it immediately.
      pushStringParam: function(string, type) {
        this.pushStackLiteral('depth' + this.lastContext);

        this.pushString(type);

        if (typeof string === 'string') {
          this.pushString(string);
        } else {
          this.pushStackLiteral(string);
        }
      },

      emptyHash: function() {
        this.pushStackLiteral('{}');

        if (this.options.stringParams) {
          this.register('hashTypes', '{}');
          this.register('hashContexts', '{}');
        }
      },
      pushHash: function() {
        this.hash = {values: [], types: [], contexts: []};
      },
      popHash: function() {
        var hash = this.hash;
        this.hash = undefined;

        if (this.options.stringParams) {
          this.register('hashContexts', '{' + hash.contexts.join(',') + '}');
          this.register('hashTypes', '{' + hash.types.join(',') + '}');
        }
        this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
      },

      // [pushString]
      //
      // On stack, before: ...
      // On stack, after: quotedString(string), ...
      //
      // Push a quoted version of `string` onto the stack
      pushString: function(string) {
        this.pushStackLiteral(this.quotedString(string));
      },

      // [push]
      //
      // On stack, before: ...
      // On stack, after: expr, ...
      //
      // Push an expression onto the stack
      push: function(expr) {
        this.inlineStack.push(expr);
        return expr;
      },

      // [pushLiteral]
      //
      // On stack, before: ...
      // On stack, after: value, ...
      //
      // Pushes a value onto the stack. This operation prevents
      // the compiler from creating a temporary variable to hold
      // it.
      pushLiteral: function(value) {
        this.pushStackLiteral(value);
      },

      // [pushProgram]
      //
      // On stack, before: ...
      // On stack, after: program(guid), ...
      //
      // Push a program expression onto the stack. This takes
      // a compile-time guid and converts it into a runtime-accessible
      // expression.
      pushProgram: function(guid) {
        if (guid != null) {
          this.pushStackLiteral(this.programExpression(guid));
        } else {
          this.pushStackLiteral(null);
        }
      },

      // [invokeHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // Pops off the helper's parameters, invokes the helper,
      // and pushes the helper's return value onto the stack.
      //
      // If the helper is not found, `helperMissing` is called.
      invokeHelper: function(paramSize, name) {
        this.context.aliases.helperMissing = 'helpers.helperMissing';

        var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

        this.push(helper.name + ' || ' + nonHelper);
        this.replaceStack(function(name) {
          return name + ' ? ' + name + '.call(' +
              helper.callParams + ") " + ": helperMissing.call(" +
              helper.helperMissingParams + ")";
        });
      },

      // [invokeKnownHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // This operation is used when the helper is known to exist,
      // so a `helperMissing` fallback is not required.
      invokeKnownHelper: function(paramSize, name) {
        var helper = this.setupHelper(paramSize, name);
        this.push(helper.name + ".call(" + helper.callParams + ")");
      },

      // [invokeAmbiguous]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of disambiguation
      //
      // This operation is used when an expression like `{{foo}}`
      // is provided, but we don't know at compile-time whether it
      // is a helper or a path.
      //
      // This operation emits more code than the other options,
      // and can be avoided by passing the `knownHelpers` and
      // `knownHelpersOnly` flags at compile-time.
      invokeAmbiguous: function(name, helperCall) {
        this.context.aliases.functionType = '"function"';

        this.pushStackLiteral('{}');    // Hash value
        var helper = this.setupHelper(0, name, helperCall);

        var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
        var nextStack = this.nextStack();

        this.source.push('if (' + nextStack + ' = ' + helperName + ') { ' + nextStack + ' = ' + nextStack + '.call(' + helper.callParams + '); }');
        this.source.push('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '.apply(depth0) : ' + nextStack + '; }');
      },

      // [invokePartial]
      //
      // On stack, before: context, ...
      // On stack after: result of partial invocation
      //
      // This operation pops off a context, invokes a partial with that context,
      // and pushes the result of the invocation back.
      invokePartial: function(name) {
        var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

        if (this.options.data) {
          params.push("data");
        }

        this.context.aliases.self = "this";
        this.push("self.invokePartial(" + params.join(", ") + ")");
      },

      // [assignToHash]
      //
      // On stack, before: value, hash, ...
      // On stack, after: hash, ...
      //
      // Pops a value and hash off the stack, assigns `hash[key] = value`
      // and pushes the hash back onto the stack.
      assignToHash: function(key) {
        var value = this.popStack(),
            context,
            type;

        if (this.options.stringParams) {
          type = this.popStack();
          context = this.popStack();
        }

        var hash = this.hash;
        if (context) {
          hash.contexts.push("'" + key + "': " + context);
        }
        if (type) {
          hash.types.push("'" + key + "': " + type);
        }
        hash.values.push("'" + key + "': (" + value + ")");
      },

      // HELPERS

      compiler: JavaScriptCompiler,

      compileChildren: function(environment, options) {
        var children = environment.children, child, compiler;

        for(var i=0, l=children.length; i<l; i++) {
          child = children[i];
          compiler = new this.compiler();

          var index = this.matchExistingProgram(child);

          if (index == null) {
            this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
            index = this.context.programs.length;
            child.index = index;
            child.name = 'program' + index;
            this.context.programs[index] = compiler.compile(child, options, this.context);
            this.context.environments[index] = child;
          } else {
            child.index = index;
            child.name = 'program' + index;
          }
        }
      },
      matchExistingProgram: function(child) {
        for (var i = 0, len = this.context.environments.length; i < len; i++) {
          var environment = this.context.environments[i];
          if (environment && environment.equals(child)) {
            return i;
          }
        }
      },

      programExpression: function(guid) {
        this.context.aliases.self = "this";

        if(guid == null) {
          return "self.noop";
        }

        var child = this.environment.children[guid],
            depths = child.depths.list, depth;

        var programParams = [child.index, child.name, "data"];

        for(var i=0, l = depths.length; i<l; i++) {
          depth = depths[i];

          if(depth === 1) { programParams.push("depth0"); }
          else { programParams.push("depth" + (depth - 1)); }
        }

        return (depths.length === 0 ? "self.program(" : "self.programWithDepth(") + programParams.join(", ") + ")";
      },

      register: function(name, val) {
        this.useRegister(name);
        this.source.push(name + " = " + val + ";");
      },

      useRegister: function(name) {
        if(!this.registers[name]) {
          this.registers[name] = true;
          this.registers.list.push(name);
        }
      },

      pushStackLiteral: function(item) {
        return this.push(new Literal(item));
      },

      pushStack: function(item) {
        this.flushInline();

        var stack = this.incrStack();
        if (item) {
          this.source.push(stack + " = " + item + ";");
        }
        this.compileStack.push(stack);
        return stack;
      },

      replaceStack: function(callback) {
        var prefix = '',
            inline = this.isInline(),
            stack;

        // If we are currently inline then we want to merge the inline statement into the
        // replacement statement via ','
        if (inline) {
          var top = this.popStack(true);

          if (top instanceof Literal) {
            // Literals do not need to be inlined
            stack = top.value;
          } else {
            // Get or create the current stack name for use by the inline
            var name = this.stackSlot ? this.topStackName() : this.incrStack();

            prefix = '(' + this.push(name) + ' = ' + top + '),';
            stack = this.topStack();
          }
        } else {
          stack = this.topStack();
        }

        var item = callback.call(this, stack);

        if (inline) {
          if (this.inlineStack.length || this.compileStack.length) {
            this.popStack();
          }
          this.push('(' + prefix + item + ')');
        } else {
          // Prevent modification of the context depth variable. Through replaceStack
          if (!/^stack/.test(stack)) {
            stack = this.nextStack();
          }

          this.source.push(stack + " = (" + prefix + item + ");");
        }
        return stack;
      },

      nextStack: function() {
        return this.pushStack();
      },

      incrStack: function() {
        this.stackSlot++;
        if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
        return this.topStackName();
      },
      topStackName: function() {
        return "stack" + this.stackSlot;
      },
      flushInline: function() {
        var inlineStack = this.inlineStack;
        if (inlineStack.length) {
          this.inlineStack = [];
          for (var i = 0, len = inlineStack.length; i < len; i++) {
            var entry = inlineStack[i];
            if (entry instanceof Literal) {
              this.compileStack.push(entry);
            } else {
              this.pushStack(entry);
            }
          }
        }
      },
      isInline: function() {
        return this.inlineStack.length;
      },

      popStack: function(wrapped) {
        var inline = this.isInline(),
            item = (inline ? this.inlineStack : this.compileStack).pop();

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          if (!inline) {
            this.stackSlot--;
          }
          return item;
        }
      },

      topStack: function(wrapped) {
        var stack = (this.isInline() ? this.inlineStack : this.compileStack),
            item = stack[stack.length - 1];

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          return item;
        }
      },

      quotedString: function(str) {
        return '"' + str
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
          .replace(/\u2029/g, '\\u2029') + '"';
      },

      setupHelper: function(paramSize, name, missingParams) {
        var params = [];
        this.setupParams(paramSize, params, missingParams);
        var foundHelper = this.nameLookup('helpers', name, 'helper');

        return {
          params: params,
          name: foundHelper,
          callParams: ["depth0"].concat(params).join(", "),
          helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
        };
      },

      // the params and contexts arguments are passed in arrays
      // to fill in
      setupParams: function(paramSize, params, useRegister) {
        var options = [], contexts = [], types = [], param, inverse, program;

        options.push("hash:" + this.popStack());

        inverse = this.popStack();
        program = this.popStack();

        // Avoid setting fn and inverse if neither are set. This allows
        // helpers to do a check for `if (options.fn)`
        if (program || inverse) {
          if (!program) {
            this.context.aliases.self = "this";
            program = "self.noop";
          }

          if (!inverse) {
           this.context.aliases.self = "this";
            inverse = "self.noop";
          }

          options.push("inverse:" + inverse);
          options.push("fn:" + program);
        }

        for(var i=0; i<paramSize; i++) {
          param = this.popStack();
          params.push(param);

          if(this.options.stringParams) {
            types.push(this.popStack());
            contexts.push(this.popStack());
          }
        }

        if (this.options.stringParams) {
          options.push("contexts:[" + contexts.join(",") + "]");
          options.push("types:[" + types.join(",") + "]");
          options.push("hashContexts:hashContexts");
          options.push("hashTypes:hashTypes");
        }

        if(this.options.data) {
          options.push("data:data");
        }

        options = "{" + options.join(",") + "}";
        if (useRegister) {
          this.register('options', options);
          params.push('options');
        } else {
          params.push(options);
        }
        return params.join(", ");
      }
    };

    var reservedWords = (
      "break else new var" +
      " case finally return void" +
      " catch for switch while" +
      " continue function this with" +
      " default if throw" +
      " delete in try" +
      " do instanceof typeof" +
      " abstract enum int short" +
      " boolean export interface static" +
      " byte extends long super" +
      " char final native synchronized" +
      " class float package throws" +
      " const goto private transient" +
      " debugger implements protected volatile" +
      " double import public let yield"
    ).split(" ");

    var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

    for(var i=0, l=reservedWords.length; i<l; i++) {
      compilerWords[reservedWords[i]] = true;
    }

    JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
      if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(name)) {
        return true;
      }
      return false;
    };

    __exports__['default'] = JavaScriptCompiler;
  });
define(
  'handlebars/compiler/compiler',["../exception","./base","./javascript-compiler","./ast","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var Exception = __dependency1__['default'];
    var parse = __dependency2__.parse;
    var JavaScriptCompiler = __dependency3__['default'];
    var AST = __dependency4__;

    function Compiler() {}

    __exports__.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
    // function in a context. This is necessary for mustache compatibility, which
    // requires that context functions in blocks are evaluated by blockHelperMissing,
    // and then proceed as if the resulting value was provided to blockHelperMissing.

    Compiler.prototype = {
      compiler: Compiler,

      disassemble: function() {
        var opcodes = this.opcodes, opcode, out = [], params, param;

        for (var i=0, l=opcodes.length; i<l; i++) {
          opcode = opcodes[i];

          if (opcode.opcode === 'DECLARE') {
            out.push("DECLARE " + opcode.name + "=" + opcode.value);
          } else {
            params = [];
            for (var j=0; j<opcode.args.length; j++) {
              param = opcode.args[j];
              if (typeof param === "string") {
                param = "\"" + param.replace("\n", "\\n") + "\"";
              }
              params.push(param);
            }
            out.push(opcode.opcode + " " + params.join(" "));
          }
        }

        return out.join("\n");
      },

      equals: function(other) {
        var len = this.opcodes.length;
        if (other.opcodes.length !== len) {
          return false;
        }

        for (var i = 0; i < len; i++) {
          var opcode = this.opcodes[i],
              otherOpcode = other.opcodes[i];
          if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
            return false;
          }
          for (var j = 0; j < opcode.args.length; j++) {
            if (opcode.args[j] !== otherOpcode.args[j]) {
              return false;
            }
          }
        }

        len = this.children.length;
        if (other.children.length !== len) {
          return false;
        }
        for (i = 0; i < len; i++) {
          if (!this.children[i].equals(other.children[i])) {
            return false;
          }
        }

        return true;
      },

      guid: 0,

      compile: function(program, options) {
        this.children = [];
        this.depths = {list: []};
        this.options = options;

        // These changes will propagate to the other compiler components
        var knownHelpers = this.options.knownHelpers;
        this.options.knownHelpers = {
          'helperMissing': true,
          'blockHelperMissing': true,
          'each': true,
          'if': true,
          'unless': true,
          'with': true,
          'log': true
        };
        if (knownHelpers) {
          for (var name in knownHelpers) {
            this.options.knownHelpers[name] = knownHelpers[name];
          }
        }

        return this.program(program);
      },

      accept: function(node) {
        return this[node.type](node);
      },

      program: function(program) {
        var statements = program.statements, statement;
        this.opcodes = [];

        for(var i=0, l=statements.length; i<l; i++) {
          statement = statements[i];
          this[statement.type](statement);
        }
        this.isSimple = l === 1;

        this.depths.list = this.depths.list.sort(function(a, b) {
          return a - b;
        });

        return this;
      },

      compileProgram: function(program) {
        var result = new this.compiler().compile(program, this.options);
        var guid = this.guid++, depth;

        this.usePartial = this.usePartial || result.usePartial;

        this.children[guid] = result;

        for(var i=0, l=result.depths.list.length; i<l; i++) {
          depth = result.depths.list[i];

          if(depth < 2) { continue; }
          else { this.addDepth(depth - 1); }
        }

        return guid;
      },

      block: function(block) {
        var mustache = block.mustache,
            program = block.program,
            inverse = block.inverse;

        if (program) {
          program = this.compileProgram(program);
        }

        if (inverse) {
          inverse = this.compileProgram(inverse);
        }

        var type = this.classifyMustache(mustache);

        if (type === "helper") {
          this.helperMustache(mustache, program, inverse);
        } else if (type === "simple") {
          this.simpleMustache(mustache);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('blockValue');
        } else {
          this.ambiguousMustache(mustache, program, inverse);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('ambiguousBlockValue');
        }

        this.opcode('append');
      },

      hash: function(hash) {
        var pairs = hash.pairs, pair, val;

        this.opcode('pushHash');

        for(var i=0, l=pairs.length; i<l; i++) {
          pair = pairs[i];
          val  = pair[1];

          if (this.options.stringParams) {
            if(val.depth) {
              this.addDepth(val.depth);
            }
            this.opcode('getContext', val.depth || 0);
            this.opcode('pushStringParam', val.stringModeValue, val.type);
          } else {
            this.accept(val);
          }

          this.opcode('assignToHash', pair[0]);
        }
        this.opcode('popHash');
      },

      partial: function(partial) {
        var partialName = partial.partialName;
        this.usePartial = true;

        if(partial.context) {
          this.ID(partial.context);
        } else {
          this.opcode('push', 'depth0');
        }

        this.opcode('invokePartial', partialName.name);
        this.opcode('append');
      },

      content: function(content) {
        this.opcode('appendContent', content.string);
      },

      mustache: function(mustache) {
        var options = this.options;
        var type = this.classifyMustache(mustache);

        if (type === "simple") {
          this.simpleMustache(mustache);
        } else if (type === "helper") {
          this.helperMustache(mustache);
        } else {
          this.ambiguousMustache(mustache);
        }

        if(mustache.escaped && !options.noEscape) {
          this.opcode('appendEscaped');
        } else {
          this.opcode('append');
        }
      },

      ambiguousMustache: function(mustache, program, inverse) {
        var id = mustache.id,
            name = id.parts[0],
            isBlock = program != null || inverse != null;

        this.opcode('getContext', id.depth);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        this.opcode('invokeAmbiguous', name, isBlock);
      },

      simpleMustache: function(mustache) {
        var id = mustache.id;

        if (id.type === 'DATA') {
          this.DATA(id);
        } else if (id.parts.length) {
          this.ID(id);
        } else {
          // Simplified ID for `this`
          this.addDepth(id.depth);
          this.opcode('getContext', id.depth);
          this.opcode('pushContext');
        }

        this.opcode('resolvePossibleLambda');
      },

      helperMustache: function(mustache, program, inverse) {
        var params = this.setupFullMustacheParams(mustache, program, inverse),
            name = mustache.id.parts[0];

        if (this.options.knownHelpers[name]) {
          this.opcode('invokeKnownHelper', params.length, name);
        } else if (this.options.knownHelpersOnly) {
          throw new Error("You specified knownHelpersOnly, but used the unknown helper " + name);
        } else {
          this.opcode('invokeHelper', params.length, name);
        }
      },

      ID: function(id) {
        this.addDepth(id.depth);
        this.opcode('getContext', id.depth);

        var name = id.parts[0];
        if (!name) {
          this.opcode('pushContext');
        } else {
          this.opcode('lookupOnContext', id.parts[0]);
        }

        for(var i=1, l=id.parts.length; i<l; i++) {
          this.opcode('lookup', id.parts[i]);
        }
      },

      DATA: function(data) {
        this.options.data = true;
        if (data.id.isScoped || data.id.depth) {
          throw new Exception('Scoped data references are not supported: ' + data.original);
        }

        this.opcode('lookupData');
        var parts = data.id.parts;
        for(var i=0, l=parts.length; i<l; i++) {
          this.opcode('lookup', parts[i]);
        }
      },

      STRING: function(string) {
        this.opcode('pushString', string.string);
      },

      INTEGER: function(integer) {
        this.opcode('pushLiteral', integer.integer);
      },

      BOOLEAN: function(bool) {
        this.opcode('pushLiteral', bool.bool);
      },

      comment: function() {},

      // HELPERS
      opcode: function(name) {
        this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
      },

      declare: function(name, value) {
        this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
      },

      addDepth: function(depth) {
        if(isNaN(depth)) { throw new Error("EWOT"); }
        if(depth === 0) { return; }

        if(!this.depths[depth]) {
          this.depths[depth] = true;
          this.depths.list.push(depth);
        }
      },

      classifyMustache: function(mustache) {
        var isHelper   = mustache.isHelper;
        var isEligible = mustache.eligibleHelper;
        var options    = this.options;

        // if ambiguous, we can possibly resolve the ambiguity now
        if (isEligible && !isHelper) {
          var name = mustache.id.parts[0];

          if (options.knownHelpers[name]) {
            isHelper = true;
          } else if (options.knownHelpersOnly) {
            isEligible = false;
          }
        }

        if (isHelper) { return "helper"; }
        else if (isEligible) { return "ambiguous"; }
        else { return "simple"; }
      },

      pushParams: function(params) {
        var i = params.length, param;

        while(i--) {
          param = params[i];

          if(this.options.stringParams) {
            if(param.depth) {
              this.addDepth(param.depth);
            }

            this.opcode('getContext', param.depth || 0);
            this.opcode('pushStringParam', param.stringModeValue, param.type);
          } else {
            this[param.type](param);
          }
        }
      },

      setupMustacheParams: function(mustache) {
        var params = mustache.params;
        this.pushParams(params);

        if(mustache.hash) {
          this.hash(mustache.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      },

      // this will replace setupMustacheParams when we're done
      setupFullMustacheParams: function(mustache, program, inverse) {
        var params = mustache.params;
        this.pushParams(params);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        if(mustache.hash) {
          this.hash(mustache.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      }
    };

    function precompile(input, options) {
      if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
      }

      options = options || {};
      if (!('data' in options)) {
        options.data = true;
      }

      var ast = parse(input);
      var environment = new Compiler().compile(ast, options);
      return new JavaScriptCompiler().compile(environment, options);
    }

    __exports__.precompile = precompile;function compile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
      }

      options = options || {};

      if (!('data' in options)) {
        options.data = true;
      }

      var compiled;

      function compileInput() {
        var ast = parse(input);
        var environment = new Compiler().compile(ast, options);
        var templateSpec = new JavaScriptCompiler().compile(environment, options, undefined, true);
        return env.template(templateSpec);
      }

      // Template is only compiled on first use and cached after that point.
      return function(context, options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled.call(this, context, options);
      };
    }

    __exports__.compile = compile;
  });
define(
  'handlebars',["./handlebars.runtime","./handlebars/compiler/ast","./handlebars/compiler/base","./handlebars/compiler/compiler","./handlebars/compiler/javascript-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    var Handlebars = __dependency1__['default'];

    // Compiler imports
    var AST = __dependency2__;
    var Parser = __dependency3__.parser;
    var parse = __dependency3__.parse;
    var Compiler = __dependency4__.Compiler;
    var compile = __dependency4__.compile;
    var precompile = __dependency4__.precompile;
    var JavaScriptCompiler = __dependency5__['default'];

    var _create = Handlebars.create;
    var create = function() {
      var hb = _create();

      hb.compile = function(input, options) {
        return compile(input, options, hb);
      };
      hb.precompile = precompile;

      hb.AST = AST;
      hb.Compiler = Compiler;
      hb.JavaScriptCompiler = JavaScriptCompiler;
      hb.Parser = Parser;
      hb.parse = parse;

      return hb;
    };

    Handlebars = create();
    Handlebars.create = create;

    __exports__['default'] = Handlebars;
  });
define("htmlbars", 
  ["htmlbars/parser","htmlbars/ast","htmlbars/compiler","htmlbars/helpers","htmlbars/macros","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var compile = __dependency3__.compile;
    var registerHelper = __dependency4__.registerHelper;
    var removeHelper = __dependency4__.removeHelper;
    var registerMacro = __dependency5__.registerMacro;
    var removeMacro = __dependency5__.removeMacro;

    __exports__.preprocess = preprocess;
    __exports__.compile = compile;
    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
    __exports__.removeHelper = removeHelper;
    __exports__.registerHelper = registerHelper;
    __exports__.removeMacro = removeMacro;
    __exports__.registerMacro = registerMacro;
  });
define("htmlbars/ast", 
  ["handlebars/compiler/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var AST = __dependency1__;

    function HTMLElement(tag, attributes, children, helpers) {
      this.tag = tag;
      this.attributes = attributes || [];
      this.children = children || [];
      this.helpers = helpers || [];

      if (!attributes) { return; }

      for (var i=0, l=attributes.length; i<l; i++) {
        var attribute = attributes[i];
        attributes[attribute[0]] = attribute[1];
      }
    }

    function appendChild(node) {
      this.children.push(node);
    }

    HTMLElement.prototype = {
      appendChild: appendChild,

      removeAttr: function(name) {
        var attributes = this.attributes, attribute;
        delete attributes[name];
        for (var i=0, l=attributes.length; i<l; i++) {
          attribute = attributes[i];
          if (attribute[0] === name) {
            attributes.splice(i, 1);
            break;
          }
        }
      },

      getAttr: function(name) {
        var attributes = this.attributes;
        if (attributes.length !== 1 || attributes[0] instanceof AST.MustacheNode) { return; }
        return attributes[name][0];
      }
    };

    function BlockElement(helper, children) {
      this.helper = helper;
      this.children = children || [];
    }

    BlockElement.prototype.appendChild = appendChild;

    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
  });
define("htmlbars/compiler", 
  ["htmlbars/parser","htmlbars/compiler/utils","htmlbars/runtime","htmlbars/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var compileAST = __dependency2__.compileAST;
    var domHelpers = __dependency3__.domHelpers;
    var helpers = __dependency4__.helpers;

    function compile(string, options) {
      return compileSpec(string, options)(domHelpers(helpers));
    }

    __exports__.compile = compile;function compileSpec(string, options) {
      var ast = preprocess(string, options);
      return compileAST(ast, options);
    }

    __exports__.compileSpec = compileSpec;
  });
define("htmlbars/compiler/attr", 
  ["htmlbars/compiler/utils","htmlbars/compiler/helpers","htmlbars/compiler/invoke","htmlbars/compiler/stack","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var helper = __dependency3__.helper;
    var popStack = __dependency4__.popStack;
    var pushStack = __dependency4__.pushStack;
    var string = __dependency5__.string;
    var hash = __dependency5__.hash;
    var quotedArray = __dependency5__.quotedArray;

    function AttrCompiler() {}

    var attrCompiler = AttrCompiler.prototype;

    attrCompiler.compile = function(opcodes, options) {
      this.output = [];
      this.stackNumber = 0;
      this.stack = [];

      this.preamble();
      processOpcodes(this, opcodes);
      this.postamble();

      /*jshint evil:true*/
      return new Function('context', 'options', this.output.join("\n"));
    };

    attrCompiler.preamble = function() {
      this.push("var buffer = []");
    };

    attrCompiler.postamble = function() {
      this.push("return buffer.join('')");
    };

    attrCompiler.content = function(str) {
      this.push("buffer.push(" + string(str) +")");
    };

    attrCompiler.dynamic = function(parts, escaped) {
      this.push(helper('resolveInAttr', 'context', quotedArray(parts), 'buffer', 'options'));
    };

    attrCompiler.ambiguous = function(string, escaped) {
      this.push(helper('ambiguousAttr', 'context', quotedArray([string]), 'buffer', 'options'));
    };

    attrCompiler.helper = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('setAttribute:options.setAttribute');

      this.push(helper('helperAttr', 'context', string(name), prepared.args, 'buffer', hash(prepared.options)));
    };

    attrCompiler.appendText = function() {
      // noop
    };

    attrCompiler.program = function() {
      pushStack(this.stack, null);
      pushStack(this.stack, null);
    };

    attrCompiler.id = function(parts) {
      pushStack(this.stack, string('id'));
      pushStack(this.stack, string(parts[0]));
    };

    attrCompiler.literal = function(literal) {
      pushStack(this.stack, string(typeof literal));
      pushStack(this.stack, literal);
    };

    attrCompiler.string = function(str) {
      pushStack(this.stack, string('string'));
      pushStack(this.stack, string(str));
    };

    attrCompiler.stackLiteral = function(literal) {
      pushStack(this.stack, literal);
    };

    attrCompiler.push = function(string) {
      this.output.push(string + ";");
    };

    __exports__.AttrCompiler = AttrCompiler;
  });
define("htmlbars/compiler/elements", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function pushElement(compiler) {
      return "element" + (++compiler.elementNumber);
    }

    __exports__.pushElement = pushElement;function popElement(compiler) {
      return "element" + (compiler.elementNumber--);
    }

    __exports__.popElement = popElement;function topElement(compiler) {
      return "element" + compiler.elementNumber;
    }
    __exports__.topElement = topElement;
  });
define("htmlbars/compiler/helpers", 
  ["htmlbars/compiler/quoting","htmlbars/compiler/stack","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;
    var popStack = __dependency2__.popStack;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = popStack(stack);

      for (i=0; i<hashSize; i++) {
        keyName = popStack(stack);
        hashPairs.unshift(keyName + ':' + popStack(stack));
        hashTypes.unshift(keyName + ':' + popStack(stack));
      }

      for (i=0; i<size; i++) {
        args.unshift(popStack(stack));
        types.unshift(popStack(stack));
      }

      var programId = popStack(stack);
      var inverseId = popStack(stack);

      var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId != null) {
        options.push('render:child' + programId + '(dom)');
      }

      if (inverseId != null) {
        options.push('inverse:child' + inverseId + '(dom)');
      }

      return {
        options: options,
        args: array(args),
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });
define("htmlbars/compiler/invoke", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function call(func) {
      if (typeof func.join === 'function') {
        func = func.join('.');
      }

      var params = [].slice.call(arguments, 1);
      return func + "(" + params.join(", ") + ")";
    }

    __exports__.call = call;

    function helper() {
      var args = [].slice.call(arguments, 0);
      args[0] = 'dom.' + args[0];
      return call.apply(this, args);
    }
    __exports__.helper = helper;
  });
define("htmlbars/compiler/pass1", 
  ["htmlbars/utils","htmlbars/ast","htmlbars/compiler/attr","htmlbars/compiler/utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var AttrCompiler = __dependency3__.AttrCompiler;
    var compileAST = __dependency4__.compileAST;

    function compileAttr(ast, options) {
      var compiler1 = new Compiler1(options),
          attrCompiler = new AttrCompiler(options);

      var opcodes = compiler1.compile(ast);
      return attrCompiler.compile(opcodes);
    }

    function Compiler1(options) {
      this.options = options || {};

      var knownHelpers = {
        'helperMissing': true,
        'blockHelperMissing': true,
        'each': true,
        'if': true,
        'unless': true,
        'with': true,
        'log': true
      };

      this.options.knownHelpers = this.options.knownHelpers || {};
      merge(knownHelpers, this.options.knownHelpers);
    };

    var compiler1 = Compiler1.prototype;

    compiler1.compile = function(ast) {
      this.opcodes = [];
      this.children = [];
      processChildren(this, ast);
      return this.opcodes;
    };

    function processChildren(compiler, children) {
      var node;

      for (var i=0, l=children.length; i<l; i++) {
        node = children[i];

        if (typeof node === 'string') {
          compiler.string(node);
        } else if (node instanceof HTMLElement) {
          compiler.element(node);
        } else if (node instanceof BlockElement) {
          compiler.block(node);
        } else {
          compiler[node.type](node);
        }
      }
    }

    compiler1.block = function(block) {
      var program = compileAST(block.children, this.options),
          inverse = compileAST(block.inverse, this.options),
          mustache = block.helper;

      this.children.push(program);
      var programId = this.children.length - 1;

      this.children.push(inverse);
      var inverseId = this.children.length - 1;

      this.opcode('program', programId, inverseId);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
      this.opcode('appendFragment');
    };

    compiler1.opcode = function(type) {
      var params = [].slice.call(arguments, 1);
      this.opcodes.push({ type: type, params: params });
    };

    compiler1.string = function(string) {
      this.opcode('content', string);
    };

    compiler1.element = function(element) {
      this.opcode('openElement', element.tag);

      element.attributes.forEach(function(attribute) {
        this.attribute(attribute);
      }, this);

      element.helpers.forEach(function(helper) {
        this.nodeHelper(helper);
      }, this);

      processChildren(this, element.children);

      this.opcode('closeElement');
    };

    compiler1.attribute = function(attribute) {
      var name = attribute[0],
          value = attribute[1];

      var program = compileAttr(value);
      this.children.push(program);

      this.opcode('attribute', name, this.children.length - 1);
      return;
    };

    compiler1.nodeHelper = function(mustache) {
      this.opcode('program', null);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('nodeHelper', mustache.id.string, mustache.params.length);
    };

    compiler1.mustache = function(mustache) {
      var type = classifyMustache(mustache, this.options);

      if (type === 'simple') {
        this.opcode('dynamic', mustache.id.parts, mustache.escaped);
      } else if (type === 'ambiguous') {
        this.opcode('ambiguous', mustache.id.string, mustache.escaped);
      } else {
        this.opcode('program', null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
      }

      appendMustache(this, mustache);
    };

    compiler1.ID = function(id) {
      this.opcode('id', id.parts);
    };

    compiler1.STRING = function(string) {
      this.opcode('string', string.stringModeValue);
    };

    compiler1.BOOLEAN = function(boolean) {
      this.opcode('literal', boolean.stringModeValue);
    };

    compiler1.INTEGER = function(integer) {
      this.opcode('literal', integer.stringModeValue);
    }

    function classifyMustache(mustache, options) {
      var isHelper   = mustache.isHelper;
      var isEligible = mustache.eligibleHelper;

      // if ambiguous, we can possibly resolve the ambiguity now
      if (isEligible && !isHelper) {
        var name = mustache.id.parts[0];

        if (options.knownHelpers[name]) {
          isHelper = true;
        } else if (options.knownHelpersOnly) {
          isEligible = false;
        }
      }

      if (isHelper) { return "helper"; }
      else if (isEligible) { return "ambiguous"; }
      else { return "simple"; }
    }

    function processParams(compiler, params) {
      params.forEach(function(param) {
        compiler[param.type](param);
      });
    }

    function processHash(compiler, hash) {
      if (hash) {
        hash.pairs.forEach(function(pair) {
          var name = pair[0], param = pair[1];
          compiler[param.type](param);
          compiler.opcode('stackLiteral', name);
        });
        compiler.opcode('stackLiteral', hash.pairs.length);
      } else {
        compiler.opcode('stackLiteral', 0);
      }
    }

    function appendMustache(compiler, mustache) {
      if (mustache.escaped) {
        compiler.opcode('appendText');
      } else {
        compiler.opcode('appendHTML');
      }
    }

    __exports__.Compiler1 = Compiler1;
  });
define("htmlbars/compiler/pass2", 
  ["htmlbars/compiler/utils","htmlbars/compiler/helpers","htmlbars/compiler/invoke","htmlbars/compiler/elements","htmlbars/compiler/stack","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    /*jshint evil:true*/

    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var call = __dependency3__.call;
    var helper = __dependency3__.helper;
    var pushElement = __dependency4__.pushElement;
    var popElement = __dependency4__.popElement;
    var topElement = __dependency4__.topElement;
    var pushStack = __dependency5__.pushStack;
    var popStack = __dependency5__.popStack;
    var string = __dependency6__.string;
    var quotedArray = __dependency6__.quotedArray;
    var hash = __dependency6__.hash;

    function Compiler2() {}

    var compiler2 = Compiler2.prototype;

    compiler2.compile = function(opcodes, options) {
      this.output = [];
      this.elementNumber = 0;
      this.stackNumber = 0;
      this.stack = [];
      this.children = options.children;

      this.output.push("return function template(context, options) {");
      this.preamble();
      processOpcodes(this, opcodes);
      this.postamble();
      this.output.push("};");

      // console.debug(this.output.join("\n"));

      // have the generated function close over the DOM helpers
      return new Function('dom', this.output.join("\n"));
    };

    compiler2.preamble = function() {
      this.children.forEach(function(child, i) {
        this.push("var child" + i + " = " + child.toString());
      }, this);

      this.push("var element0, el");
      this.push("var frag = element0 = dom.createDocumentFragment()");
    };

    compiler2.postamble = function() {
      this.output.push("return frag;");
    };

    compiler2.program = function(programId, inverseId) {
      pushStack(this.stack, inverseId);
      pushStack(this.stack, programId);
    };

    compiler2.content = function(str) {
      this.push(call([this.el(), 'appendChild'], helper('frag', this.el(), string(str))));
    };

    compiler2.push = function(string) {
      this.output.push(string + ";");
    };

    compiler2.el = function() {
      return topElement(this);
    };

    compiler2.id = function(parts) {
      pushStack(this.stack, string('id'));
      pushStack(this.stack, quotedArray(parts));
    };

    compiler2.literal = function(literal) {
      pushStack(this.stack, string(typeof literal));
      pushStack(this.stack, literal);
    };

    compiler2.stackLiteral = function(literal) {
      pushStack(this.stack, literal);
    };

    compiler2.string = function(str) {
      pushStack(this.stack, string('string'));
      pushStack(this.stack, string(str));
    };

    compiler2.appendText = function() {
      this.push(helper('appendText', this.el(), popStack(this.stack)));
    };

    compiler2.appendHTML = function() {
      this.push(helper('appendHTML', this.el(), popStack(this.stack)));
    };

    compiler2.appendFragment = function() {
      this.push(helper('appendFragment', this.el(), popStack(this.stack)));
    };

    compiler2.openElement = function(tagName) {
      var elRef = pushElement(this);
      this.push("var " + elRef + " = el = " + call('dom.createElement', string(tagName)));
    };

    compiler2.attribute = function(name, child) {
      var invokeSetAttribute = call(['el', 'setAttribute'], string(name), 'value');
      var setAttribute = 'function setAttribute(value) { ' + invokeSetAttribute + '}';
      var options = hash(['setAttribute:' + setAttribute]);
      pushStack(this.stack, call('child' + child, 'context', options));

      this.push(call('dom.setAttribute', 'el', string(name), popStack(this.stack), hash(['context:context'])));
    };

    compiler2.closeElement = function() {
      var elRef = popElement(this);
      this.push(call([this.el(), 'appendChild'], elRef));
    };

    compiler2.dynamic = function(parts, escaped) {
      pushStack(this.stack, helper('resolveContents', 'context', quotedArray(parts), this.el(), escaped));
    };

    compiler2.ambiguous = function(str, escaped) {
      pushStack(this.stack, helper('ambiguousContents', this.el(), 'context', string(str), escaped));
    };

    compiler2.helper = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      pushStack(this.stack, helper('helperContents', string(name), this.el(), 'context', prepared.args, hash(prepared.options)));
    };

    compiler2.nodeHelper = function(name, size) {
      var prepared = prepareHelper(this.stack, size);
      this.push(helper('helperContents', string(name), this.el(), 'context', prepared.args, hash(prepared.options)));
    };

    __exports__.Compiler2 = Compiler2;
  });
define("htmlbars/compiler/quoting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      return str.replace(/'/g, "\\'");
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return "'" + escapeString(str) + "'";
    }

    __exports__.string = string;

    function array(array) {
      return "[" + array + "]";
    }

    __exports__.array = array;

    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }

    __exports__.quotedArray = quotedArray;function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }
    __exports__.hash = hash;
  });
define("htmlbars/compiler/stack", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // this file exists in anticipation of a more involved
    // stack implementation involving temporary variables

    function pushStack(stack, literal) {
      stack.push({ literal: true, value: literal });
    }

    __exports__.pushStack = pushStack;function popStack(stack) {
      var poppedValue = stack.pop();
      return poppedValue.value;
    }
    __exports__.popStack = popStack;
  });
define("htmlbars/compiler/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function processOpcodes(compiler, opcodes) {
      opcodes.forEach(function(opcode) {
        compiler[opcode.type].apply(compiler, opcode.params);
      });
    }

    __exports__.processOpcodes = processOpcodes;function stream(string) {
      return "dom.stream(function(stream) { return " + string + " })";
    }

    __exports__.stream = stream;function compileAST(ast, options) {
      // circular dependency hack
      var Compiler1 = requireModule('htmlbars/compiler/pass1').Compiler1;
      var Compiler2 = requireModule('htmlbars/compiler/pass2').Compiler2;

      var compiler1 = new Compiler1(options),
          compiler2 = new Compiler2(options);

      var opcodes = compiler1.compile(ast);
      return compiler2.compile(opcodes, {
        children: compiler1.children
      });
    }

    __exports__.compileAST = compileAST;
  });
define("htmlbars/helpers", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var helpers = {};

    function registerHelper(name, callback) {
      helpers[name] = callback;
    }

    __exports__.registerHelper = registerHelper;function removeHelper(name) {
      delete helpers[name];
    }

    __exports__.removeHelper = removeHelper;__exports__.helpers = helpers;
  });
define("htmlbars/html-parser/process-token", 
  ["htmlbars/ast","simple-html-tokenizer","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var Chars = __dependency2__.Chars;
    var StartTag = __dependency2__.StartTag;
    var EndTag = __dependency2__.EndTag;

    /**
      @param {String} state the current state of the tokenizer
      @param {Array} stack the element stack
      @token {Token} token the current token being built
      @child {Token|Mustache|Block} child the new token to insert into the AST
    */
    function processToken(state, stack, token, child, macros) {
      // EOF
      if (child === undefined) { return; }
      return handlers[child.type](child, currentElement(stack), stack, token, state, macros);
    }

    __exports__.processToken = processToken;function currentElement(stack) {
      return stack[stack.length - 1];
    }

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    }

    var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
    var voidMap = {};

    voidTagNames.split(" ").forEach(function(tagName) {
      voidMap[tagName] = true;
    });

    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
    var handlers = {
      Chars: function(token, current) {
        current.appendChild(token.chars);
      },

      StartTag: function(tag, current, stack) {
        var element = new HTMLElement(tag.tagName, tag.attributes, [], tag.helpers);
        stack.push(element);

        if (voidMap.hasOwnProperty(tag.tagName)) {
          this.EndTag(tag, element, stack);
        }
      },

      block: function(block, current, stack) {
        stack.push(new BlockElement(block.mustache));
      },

      mustache: function(mustache, current, stack, token, state) {
        switch(states[state]) {
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            current.appendChild(mustache);
        }
      },

      EndTag: function(tag, current, stack, token, state, macros) {
        if (current.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
        }

        var value = config.processHTMLMacros(current, macros);
        stack.pop();

        if (value === 'veto') { return; }

        var parent = currentElement(stack);
        parent.appendChild(value || current);
      }
    };

    var config = {
      processHTMLMacros: function() {}
    };

    __exports__.config = config;
  });
define("htmlbars/macros", 
  ["htmlbars/html-parser/process-token","htmlbars/ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var HTMLElement = __dependency2__.HTMLElement;

    var htmlMacros = {};

    function registerMacro(name, test, mutate) {
      htmlMacros[name] = { test: test, mutate: mutate };
    }

    __exports__.registerMacro = registerMacro;function removeMacro(name) {
      delete htmlMacros[name];
    }

    __exports__.removeMacro = removeMacro;function processHTMLMacros(element, macros) {
      var mutated, newElement;

      macros = macros || htmlMacros;

      for (var prop in htmlMacros) {
        var macro = htmlMacros[prop];
        if (macro.test(element)) {
          newElement = macro.mutate(element);
          if (newElement === undefined) { newElement = element; }
          mutated = true;
          break;
        }
      }

      if (!mutated) {
        return element;
      } else if (newElement instanceof HTMLElement) {
        return processHTMLMacros(newElement);
      } else {
        return newElement;
      }
    }

    // configure the HTML Parser
    config.processHTMLMacros = processHTMLMacros;
  });
define("htmlbars/parser", 
  ["simple-html-tokenizer","htmlbars/ast","htmlbars/html-parser/process-token","handlebars","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Tokenizer = __dependency1__.Tokenizer;
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var processToken = __dependency3__.processToken;
    var Handlebars = __dependency4__["default"];

    function Visitor() {}

    Visitor.prototype = {
      constructor: Visitor,

      accept: function(node) {
        return this[node.type](node);
      }
    };

    function preprocess(html, options) {
      var ast = Handlebars.parse(html);
      return new HTMLProcessor(options || {}).accept(ast);
    }

    __exports__.preprocess = preprocess;function HTMLProcessor(options) {
      // document fragment
      this.elementStack = [new HTMLElement()];
      this.tokenizer = new Tokenizer('');
      this.macros = options.macros;
    }

    // TODO: ES3 polyfill
    var processor = HTMLProcessor.prototype = Object.create(Visitor.prototype);

    processor.program = function(program) {
      var statements = program.statements;

      for (var i=0, l=statements.length; i<l; i++) {
        this.accept(statements[i]);
      }

      process(this, this.tokenizer.tokenizeEOF());

      // return the children of the top-level document fragment
      return this.elementStack[0].children;
    };

    processor.block = function(block) {
      switchToHandlebars(this);

      process(this, block);

      if (block.program) {
        this.accept(block.program);
      }

      this.tokenizer.token = null;
      this.elementStack.push(new BlockElement());

      if (block.inverse) {
        this.accept(block.inverse);
      }

      var inverse = this.elementStack.pop();
      var blockNode = this.elementStack.pop();

      blockNode.inverse = inverse.children;

      currentElement(this).children.push(blockNode);
    };

    processor.content = function(content) {
      var tokens = this.tokenizer.tokenizePart(content.string);

      return tokens.forEach(function(token) {
        process(this, token);
      }, this);
    };

    processor.mustache = function(mustache) {
      switchToHandlebars(this);

      process(this, mustache);
    };

    function switchToHandlebars(compiler) {
      var token = compiler.tokenizer.token;

      // TODO: Monkey patch Chars.addChar like attributes
      if (token instanceof Chars) {
        process(compiler, token);
        compiler.tokenizer.token = null;
      }
    }

    function process(compiler, token) {
      var tokenizer = compiler.tokenizer;
      processToken(tokenizer.state, compiler.elementStack, tokenizer.token, token, compiler.macros);
    }

    function currentElement(processor) {
      var elementStack = processor.elementStack;
      return elementStack[elementStack.length - 1];
    }

    StartTag.prototype.addToAttributeValue = function(char) {
      var value = this.currentAttribute[1] = this.currentAttribute[1] || [];

      if (value.length && typeof value[value.length - 1] === 'string' && typeof char === 'string') {
        value[value.length - 1] += char;
      } else {
        value.push(char);
      }
    };

    StartTag.prototype.addTagHelper = function(helper) {
      var helpers = this.helpers = this.helpers || [];

      helpers.push(helper);
    };
  });
define("htmlbars/runtime", 
  ["htmlbars/utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;

    function domHelpers(helpers, extensions) {
      var base = {
        // These methods are runtime for now. If they are too expensive,
        // I may inline them at compile-time.
        appendText: function(element, value) {
          if (value === undefined) { return; }
          element.appendChild(document.createTextNode(value));
        },

        appendHTML: function(element, value) {
          if (value === undefined) { return; }
          element.appendChild(this.frag(element, value));
        },

        appendFragment: function(element, fragment) {
          if (fragment === undefined) { return; }
          element.appendChild(fragment);
        },

        ambiguousContents: function(element, context, string, escaped) {
          var helper, value, args;

          if (helper = helpers[string]) {
            return this.helperContents(string, element, context, [], { element: element, escaped: escaped });
          } else {
            return this.resolveContents(context, [string], element, escaped);
          }
        },

        helperContents: function(name, element, context, args, options) {
          var helper = helpers[name];
          options.element = element;
          args.push(options);
          return helper.apply(context, args);
        },

        resolveContents: function(context, parts, element, escaped) {
          var helper = helpers.RESOLVE;
          if (helper) {
            var options = {
              element: element,
              escaped: escaped,
              append: this.appendCallback(element),
              dom: this
            };

            return helper.apply(context, [parts, options]);
          }

          return parts.reduce(function(current, part) {
            return current[part];
          }, context);
        },

        ambiguousAttr: function(context, string, stream, buffer, options) {
          var helper;

          if (helper = helpers[string]) {
            throw new Error("helperAttr is not implemented yet");
          } else {
            return this.resolveInAttr(context, [string], stream, buffer, options);
          }
        },

        helperAttr: function(context, name, args, buffer, options) {
          options.dom = this;
          var helper = helpers[name], position = buffer.length;
          args.push(options);

          var stream = this.throttle(helper.apply(context, args));

          buffer.push('');

          // skip(stream, 1)
          var skippedFirst = false;

          stream.subscribe(function(next) {
            buffer[position] = next;

            if (skippedFirst) {
              options.setAttribute(buffer.join(''));
            } else {
              skippedFirst = true;
            }
          });
        },

        resolveInAttr: function(context, parts, buffer, options) {
          var helper = helpers.RESOLVE_IN_ATTR;

          options.dom = this;

          if (helper) {
            var position = buffer.length;
            buffer.push('');

            var stream = helper.call(context, parts, options);

            // skip(stream, 1)
            var skippedFirst = false;

            stream.subscribe(function(next) {
              buffer[position] = next;

              if (skippedFirst) {
                options.setAttribute(buffer.join(''));
              } else {
                skippedFirst = true;
              }
            });

            return;
          }

          var out = parts.reduce(function(current, part) {
            return current[part];
          }, context);

          buffer.push(out);
        },

        setAttribute: function(element, name, value, options) {
          var callback;

          this.setAttr(element, name, subscribe);
          callback(value);

          function subscribe(listener) {
            callback = listener;
          }
        },

        setAttr: function(element, name, subscribe) {
          subscribe(function(value) {
            element.setAttribute(name, value);
          });
        },

        frag: function(element, string) {
          if (element.nodeType === 11) {
            element = this.createElement('div');
          }

          return this.createContextualFragment(element, string);
        },

        // overridable
        appendCallback: function(element) {
          return function(node) { element.appendChild(node); };
        },

        createElement: function() {
          return document.createElement.apply(document, arguments);
        },

        createDocumentFragment: function() {
          return document.createDocumentFragment.apply(document, arguments);
        },

        createContextualFragment: function(element, string) {
          var range = this.createRange();
          range.setStart(element, 0);
          range.collapse(false);
          return range.createContextualFragment(string);
        },

        createRange: function() {
          return document.createRange();
        },

        throttle: function(stream) {
          return stream;
        }
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.domHelpers = domHelpers;function hydrate(spec, options) {
      return spec(domHelpers(options.helpers || {}, options.extensions || {}));
    }

    __exports__.hydrate = hydrate;
  });
define("htmlbars/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
define("simple-html-tokenizer", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*jshint boss:true*/

    var objectCreate = Object.create || function(obj) {
      function F() {}
      F.prototype = obj;
      return new F();
    };

    function isSpace(char) {
      return (/[\n\r\t ]/).test(char);
    }

    function isAlpha(char) {
      return (/[A-Za-z]/).test(char);
    }

    function Tokenizer(input) {
      this.input = input;
      this.char = 0;
      this.state = 'data';
      this.token = null;
    }

    Tokenizer.prototype = {
      tokenize: function() {
        var tokens = [], token;

        while (true) {
          token = this.lex();
          if (token === 'EOF') { break; }
          if (token) { tokens.push(token); }
        }

        if (this.token) {
          tokens.push(this.token);
        }

        return tokens;
      },

      tokenizePart: function(string) {
        this.input += string;
        var tokens = [], token;

        while (this.char < this.input.length) {
          token = this.lex();
          if (token) { tokens.push(token); }
        }

        this.tokens = (this.tokens || []).concat(tokens);
        return tokens;
      },

      tokenizeEOF: function() {
        if (this.token) {
          return this.token;
        }
      },

      tag: function(Type, char) {
        char = char.toLowerCase();

        var lastToken = this.token;
        this.token = new Type(char);
        this.state = 'tagName';
        return lastToken;
      },

      selfClosing: function() {
        this.token.selfClosing = true;
      },

      attribute: function(char) {
        this.token.startAttribute(char);
        this.state = 'attributeName';
      },

      addToAttributeName: function(char) {
        this.token.addToAttributeName(char.toLowerCase());
      },

      addToAttributeValue: function(char) {
        this.token.addToAttributeValue(char);
      },

      commentStart: function() {
        var lastToken = this.token;
        this.token = new CommentToken();
        this.state = 'commentStart';
        return lastToken;
      },

      addToComment: function(char) {
        this.token.addChar(char);
      },

      emitData: function() {
        var lastToken = this.token;
        this.token = null;
        this.state = 'tagOpen';
        return lastToken;
      },

      emitToken: function() {
        var lastToken = this.token.finalize();
        this.token = null;
        this.state = 'data';
        return lastToken;
      },

      addData: function(char) {
        if (this.token === null) {
          this.token = new Chars();
        }

        this.token.addChar(char);
      },

      lex: function() {
        var char = this.input.charAt(this.char++);

        if (char) {
          // console.log(this.state, char);
          return this.states[this.state].call(this, char);
        } else {
          return 'EOF';
        }
      },

      states: {
        data: function(char) {
          if (char === "<") {
            return this.emitData();
          } else {
            this.addData(char);
          }
        },

        tagOpen: function(char) {
          if (char === "!") {
            this.state = 'markupDeclaration';
          } else if (char === "/") {
            this.state = 'endTagOpen';
          } else if (!isSpace(char)) {
            return this.tag(StartTag, char);
          }
        },

        markupDeclaration: function(char) {
          if (char === "-" && this.input[this.char] === "-") {
            this.char++;
            this.commentStart();
          }
        },

        commentStart: function(char) {
          if (char === "-") {
            this.state = 'commentStartDash';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment(char);
            this.state = 'comment';
          }
        },

        commentStartDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("-");
            this.state = 'comment';
          }
        },

        comment: function(char) {
          if (char === "-") {
            this.state = 'commentEndDash';
          } else {
            this.addToComment(char);
          }
        },

        commentEndDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else {
            this.addToComment('-' + char);
            this.state = 'comment';
          }
        },

        commentEnd: function(char) {
          if (char === ">") {
            return this.emitToken();
          }
        },

        tagName: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if(/[A-Za-z]/.test(char)) {
            this.token.addToTagName(char);
          } else if (char === ">") {
            return this.emitToken();
          }
        },

        beforeAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        attributeName: function(char) {
          if (isSpace(char)) {
            this.state = 'afterAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeName(char);
          }
        },

        beforeAttributeValue: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === '"') {
            this.state = 'attributeValueDoubleQuoted';
          } else if (char === "'") {
            this.state = 'attributeValueSingleQuoted';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.state = 'attributeValueUnquoted';
            this.addToAttributeValue(char);
          }
        },

        attributeValueDoubleQuoted: function(char) {
          if (char === '"') {
            this.state = 'afterAttributeValueQuoted';
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueSingleQuoted: function(char) {
          if (char === "'") {
            this.state = 'afterAttributeValueQuoted';
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueUnquoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeValue(char);
          }
        },

        afterAttributeValueQuoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        selfClosingStartTag: function(char) {
          if (char === ">") {
            this.selfClosing();
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        endTagOpen: function(char) {
          if (isAlpha(char)) {
            this.tag(EndTag, char);
          }
        }
      }
    };

    function Tag(tagName, attributes, options) {
      this.tagName = tagName || "";
      this.attributes = attributes || [];
      this.selfClosing = options ? options.selfClosing : false;
    }

    Tag.prototype = {
      constructor: Tag,

      addToTagName: function(char) {
        this.tagName += char;
      },

      startAttribute: function(char) {
        this.currentAttribute = [char.toLowerCase(), null];
        this.attributes.push(this.currentAttribute);
      },

      addToAttributeName: function(char) {
        this.currentAttribute[0] += char;
      },

      addToAttributeValue: function(char) {
        this.currentAttribute[1] = this.currentAttribute[1] || "";
        this.currentAttribute[1] += char;
      },

      finalize: function() {
        delete this.currentAttribute;
        return this;
      }
    };

    function StartTag() {
      Tag.apply(this, arguments);
    }

    StartTag.prototype = objectCreate(Tag.prototype);
    StartTag.prototype.type = 'StartTag';
    StartTag.prototype.constructor = StartTag;

    StartTag.prototype.toHTML = function() {
      return config.generateTag(this);
    };

    function generateTag(tag) {
      var out = "<";
      out += tag.tagName;

      if (tag.attributes.length) {
        out += " " + config.generateAttributes(tag.attributes);
      }

      out += ">";

      return out;
    }

    function generateAttributes(attributes) {
      var out = [], attribute, attrString, value;

      for (var i=0, l=attributes.length; i<l; i++) {
        attribute = attributes[i];

        out.push(config.generateAttribute.apply(this, attribute));
      }

      return out.join(" ");
    }

    function generateAttribute(name, value) {
      var attrString = name;

      if (value) {
        value = value.replace(/"/, '\\"');
        attrString += "=\"" + value + "\"";
      }

      return attrString;
    }

    function EndTag() {
      Tag.apply(this, arguments);
    }

    EndTag.prototype = objectCreate(Tag.prototype);
    EndTag.prototype.type = 'EndTag';
    EndTag.prototype.constructor = EndTag;

    EndTag.prototype.toHTML = function() {
      var out = "</";
      out += this.tagName;
      out += ">";

      return out;
    };

    function Chars(chars) {
      this.chars = chars || "";
    }

    Chars.prototype = {
      type: 'Chars',
      constructor: Chars,

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return this.chars;
      }
    };

    function CommentToken() {
      this.chars = "";
    }

    CommentToken.prototype = {
      type: 'CommentToken',
      constructor: CommentToken,
      
      finalize: function() { return this; },

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return "<!--" + this.chars + "-->";
      }
    };

    function tokenize(input) {
      var tokenizer = new Tokenizer(input);
      return tokenizer.tokenize();
    }

    function generate(tokens) {
      var output = "";

      for (var i=0, l=tokens.length; i<l; i++) {
        output += tokens[i].toHTML();
      }

      return output;
    }

    var config = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    var original = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    function configure(name, value) {
      config[name] = value;
    }

    __exports__.Tokenizer = Tokenizer;
    __exports__.tokenize = tokenize;
    __exports__.generate = generate;
    __exports__.configure = configure;
    __exports__.original = original;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
    __exports__.Chars = Chars;
    __exports__.CommentToken = CommentToken;
  });
//# sourceMappingURL=htmlbars.amd.js.map
global.htmlbars = requireModule("htmlbars");
})(global || window);