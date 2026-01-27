/* eslint-disable new-cap */
import Visitor from './visitor.js';

export function print(ast) {
  return new PrintVisitor().accept(ast);
}

export function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new Visitor();

PrintVisitor.prototype.pad = function (string) {
  let out = '';

  for (let i = 0, l = this.padding; i < l; i++) {
    out += '  ';
  }

  out += string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  let out = '',
    body = program.body,
    i,
    l;

  if (program.blockParams) {
    let blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out += this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  if (mustache.params.length > 0 || mustache.hash) {
    return this.pad('{{ ' + this.callBody(mustache) + ' }}');
  } else {
    return this.pad('{{ ' + this.accept(mustache.path) + ' }}');
  }
};
PrintVisitor.prototype.Decorator = function (mustache) {
  return this.pad('{{ DIRECTIVE ' + this.callBody(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = PrintVisitor.prototype.DecoratorBlock =
  function (block) {
    let out = '';

    out += this.pad(
      (block.type === 'DecoratorBlock' ? 'DIRECTIVE ' : '') + 'BLOCK:'
    );
    this.padding++;
    out += this.pad(this.callBody(block));
    if (block.program) {
      out += this.pad('PROGRAM:');
      this.padding++;
      out += this.accept(block.program);
      this.padding--;
    }
    if (block.inverse) {
      if (block.program) {
        this.padding++;
      }
      out += this.pad('{{^}}');
      this.padding++;
      out += this.accept(block.inverse);
      this.padding--;
      if (block.program) {
        this.padding--;
      }
    }
    this.padding--;

    return out;
  };

PrintVisitor.prototype.PartialStatement = function (partial) {
  let content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};
PrintVisitor.prototype.PartialBlockStatement = function (partial) {
  let content = 'PARTIAL BLOCK:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }

  content += ' ' + this.pad('PROGRAM:');
  this.padding++;
  content += this.accept(partial.program);
  this.padding--;

  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad("CONTENT[ '" + content.value + "' ]");
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad("{{! '" + comment.value + "' }}");
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  return `(${this.callBody(sexpr)})`;
};

PrintVisitor.prototype.callBody = function (callExpr) {
  let params = callExpr.params,
    paramStrings = [],
    hash;

  for (let i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params =
    paramStrings.length === 0 ? '' : ' [' + paramStrings.join(', ') + ']';

  hash = callExpr.hash ? ' ' + this.accept(callExpr.hash) : '';

  return this.accept(callExpr.path) + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  let head =
    typeof id.head === 'string' ? id.head : `[${this.accept(id.head)}]`;
  let path = [head, ...id.tail].join('/');
  return 'p%' + prefix(id) + path;
};

function prefix(path) {
  if (path.data) {
    return '@';
  } else if (path.this) {
    return 'this.';
  } else {
    return '';
  }
}

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'n%' + number.value;
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'b%' + bool.value;
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.ArrayLiteral = function (array) {
  return `Array[${array.items.map((item) => this.accept(item)).join(', ')}]`;
};

PrintVisitor.prototype.HashLiteral = function (hash) {
  return `Hash{${this.hashPairs(hash)}}`;
};

PrintVisitor.prototype.Hash = function (hash) {
  return `HASH{${this.hashPairs(hash)}}`;
};

PrintVisitor.prototype.hashPairs = function (hash) {
  let pairs = hash.pairs,
    joinedPairs = [];

  for (let i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.HashPair(pairs[i]));
  }

  return joinedPairs.join(' ');
};

PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/* eslint-enable new-cap */
