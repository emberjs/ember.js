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
    var token = this.token;
    if (token) {
      this.token = null;
      return token;
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
      } else if(/[A-Za-z0-9]/.test(char)) {
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

export { Tokenizer, tokenize, generate, configure, original, StartTag, EndTag, Chars, CommentToken };
