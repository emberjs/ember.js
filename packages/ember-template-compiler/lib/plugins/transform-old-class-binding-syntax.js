import Ember from 'ember-metal/core';

export default function TransformOldClassBindingSyntax() {
  this.syntax = null;
}

TransformOldClassBindingSyntax.prototype.transform = function TransformOldClassBindingSyntax_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    let allOfTheMicrosyntaxes = [];
    let allOfTheMicrosyntaxIndexes = [];
    let classPair;

    each(node.hash.pairs, (pair, index) => {
      let { key } = pair;

      if (key === 'classBinding' || key === 'classNameBindings') {
        allOfTheMicrosyntaxIndexes.push(index);
        allOfTheMicrosyntaxes.push(pair);
      } else if (key === 'class') {
        classPair = pair;
      }
    });

    if (allOfTheMicrosyntaxes.length === 0) { return; }

    let classValue = [];

    if (classPair) {
      classValue.push(classPair.value);
    } else {
      classPair = b.pair('class', null);
      node.hash.pairs.push(classPair);
    }

    each(allOfTheMicrosyntaxIndexes, index => {
      node.hash.pairs.splice(index, 1);
    });

    each(allOfTheMicrosyntaxes, ({ value, loc }) => {
      let sexprs = [];

      let sourceInformation = "";
      if (loc) {
        let { start, source } = loc;

        sourceInformation = `@ ${start.line}:${start.column} in ${source || '(inline)'}`;
      }

      // TODO: Parse the microsyntax and offer the correct information
      Ember.deprecate(`You're using legacy class binding syntax: classBinding=${exprToString(value)} ${sourceInformation}. Please replace with class=""`);

      if (value.type === 'StringLiteral') {
        let microsyntax = parseMicrosyntax(value.original);

        buildSexprs(microsyntax, sexprs, b);

        classValue.push.apply(classValue, sexprs);
      }
    });

    let hash = b.hash([b.pair('separator', b.string(' '))]);
    classPair.value = b.sexpr(b.string('-concat'), classValue, hash);
  });

  return ast;
};

function buildSexprs(microsyntax, sexprs, b) {
  for (var i=0, l=microsyntax.length; i<l; i++) {
    let [propName, activeClass, inactiveClass] = microsyntax[i];
    let sexpr;

    // :my-class-name microsyntax for static values
    if (propName === '') {
      sexpr = b.string(activeClass);
    } else {
      let params = [b.path(propName)];

      if (activeClass) {
        params.push(b.string(activeClass));
      } else {
        let sexprParams = [b.string(propName), b.path(propName)];

        let hash = b.hash();
        if (activeClass !== undefined) {
          hash.pairs.push(b.pair('activeClass', b.string(activeClass)));
        }

        if (inactiveClass !== undefined) {
          hash.pairs.push(b.pair('inactiveClass', b.string(inactiveClass)));
        }

        params.push(b.sexpr(b.string('-normalize-class'), sexprParams, hash));
      }

      if (inactiveClass) {
        params.push(b.string(inactiveClass));
      }

      sexpr = b.sexpr(b.string('if'), params);
    }

    sexprs.push(sexpr);
  }
}

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement');
}

function each(list, callback) {
  for (var i=0, l=list.length; i<l; i++) {
    callback(list[i], i);
  }
}

function parseMicrosyntax(string) {
  var segments = string.split(' ');

  for (var i=0, l=segments.length; i<l; i++) {
    segments[i] = segments[i].split(':');
  }

  return segments;
}

function exprToString(expr) {
  switch (expr.type) {
    case 'StringLiteral': return `"${expr.original}"`;
    case 'PathExpression': return expr.original;
  }
}

