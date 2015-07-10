export default function TransformOldClassBindingSyntax(options) {
  this.syntax = null;
  this.options = options;
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
      classValue.push(b.string(' '));
    } else {
      classPair = b.pair('class', null);
      node.hash.pairs.push(classPair);
    }

    each(allOfTheMicrosyntaxIndexes, index => {
      node.hash.pairs.splice(index, 1);
    });

    each(allOfTheMicrosyntaxes, ({ value, loc }) => {
      let sexprs = [];
      // TODO: add helpful deprecation when both `classNames` and `classNameBindings` can
      // be removed.

      if (value.type === 'StringLiteral') {
        let microsyntax = parseMicrosyntax(value.original);

        buildSexprs(microsyntax, sexprs, b);

        classValue.push.apply(classValue, sexprs);
      }
    });

    let hash = b.hash();
    classPair.value = b.sexpr(b.string('concat'), classValue, hash);
  });

  return ast;
};

function buildSexprs(microsyntax, sexprs, b) {
  for (var i = 0, l = microsyntax.length; i<l; i++) {
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
    sexprs.push(b.string(' '));
  }
}

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement');
}

function each(list, callback) {
  for (var i = 0, l = list.length; i<l; i++) {
    callback(list[i], i);
  }
}

function parseMicrosyntax(string) {
  var segments = string.split(' ');

  for (var i = 0, l = segments.length; i<l; i++) {
    segments[i] = segments[i].split(':');
  }

  return segments;
}
