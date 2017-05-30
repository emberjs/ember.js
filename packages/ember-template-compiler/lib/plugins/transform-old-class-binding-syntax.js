import { assert } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

export default function TransformOldClassBindingSyntax(options) {
  this.syntax = null;
  this.options = options;
}

TransformOldClassBindingSyntax.prototype.transform = function TransformOldClassBindingSyntax_transform(ast) {
  let b = this.syntax.builders;
  let walker = new this.syntax.Walker();
  let moduleName = this.options.moduleName;

  walker.visit(ast, node => {
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

    each(allOfTheMicrosyntaxes, ({ value, loc, key }) => {
      let sexprs = [];
      // TODO: add helpful deprecation when both `classNames` and `classNameBindings` can
      // be removed.

      if (value.type === 'StringLiteral') {
        let microsyntax = parseMicrosyntax(value.original);

        if (key === 'classNameBindings') {
          assertValidClassNameBindings(microsyntax, moduleName, loc);
        }

        buildSexprs(microsyntax, sexprs, b);

        classValue.push(...sexprs);
      }
    });

    let hash = b.hash();
    classPair.value = b.sexpr(b.path('concat'), classValue, hash);
  });

  return ast;
};

function buildSexprs(microsyntax, sexprs, b) {
  for (let i = 0; i < microsyntax.length; i++) {
    let [propName, activeClass, inactiveClass] = microsyntax[i];
    let sexpr;

    // :my-class-name microsyntax for static values
    if (propName === '') {
      sexpr = b.string(activeClass);
    } else {
      let params = [b.path(propName)];

      if (activeClass || activeClass === '') {
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

        params.push(b.sexpr(b.path('-normalize-class'), sexprParams, hash));
      }

      if (inactiveClass || inactiveClass === '') {
        params.push(b.string(inactiveClass));
      }

      sexpr = b.sexpr(b.path('if'), params);
    }

    sexprs.push(sexpr);
    sexprs.push(b.string(' '));
  }
}

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement');
}

function each(list, callback) {
  for (let i = 0; i < list.length; i++) {
    callback(list[i], i);
  }
}

function parseMicrosyntax(string) {
  let segments = string.split(' ');

  for (let i = 0; i < segments.length; i++) {
    segments[i] = segments[i].split(':');
  }

  return segments;
}

function assertValidClassNameBindings(microsyntax, moduleName, loc) {
  each(microsyntax, (segment) => {
    if (segment.length === 1) {
      assert(invalidClassNameBindingsMessage(segment, moduleName, loc));
    }
  });
}

function invalidClassNameBindingsMessage(segment, moduleName, loc) {
  let source = calculateLocationDisplay(moduleName, loc);
  return `'${segment[0]}' is not a valid classNameBinding. ${source}`;
}
