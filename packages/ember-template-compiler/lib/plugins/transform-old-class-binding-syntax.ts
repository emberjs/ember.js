import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';

export default function transformOldClassBindingSyntax(env: ASTPluginEnvironment): ASTPlugin {
  let b = env.syntax.builders;

  return {
    name: 'transform-old-class-binding-syntax',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement) {
        process(b, node);
      },

      BlockStatement(node: AST.BlockStatement) {
        process(b, node);
      },
    },
  };
}

function process(b: Builders, node: AST.BlockStatement | AST.MustacheStatement) {
  let allOfTheMicrosyntaxes: AST.HashPair[] = [];
  let allOfTheMicrosyntaxIndexes: number[] = [];
  let classPair: AST.HashPair | undefined;

  each(node.hash.pairs, (pair, index) => {
    let { key } = pair;

    if (key === 'classBinding' || key === 'classNameBindings') {
      allOfTheMicrosyntaxIndexes.push(index);
      allOfTheMicrosyntaxes.push(pair);
    } else if (key === 'class') {
      classPair = pair;
    }
  });

  if (allOfTheMicrosyntaxes.length === 0) {
    return;
  }

  let classValue: AST.Expression[] = [];

  if (classPair) {
    classValue.push(classPair.value);
    classValue.push(b.string(' '));
  } else {
    classPair = b.pair('class', null as any);
    node.hash.pairs.push(classPair);
  }

  each(allOfTheMicrosyntaxIndexes, index => {
    node.hash.pairs.splice(index, 1);
  });

  each(allOfTheMicrosyntaxes, ({ value }) => {
    let sexprs: AST.Expression[] = [];
    // TODO: add helpful deprecation when both `classNames` and `classNameBindings` can
    // be removed.

    if (value.type === 'StringLiteral') {
      let microsyntax = parseMicrosyntax(value.original);

      buildSexprs(microsyntax, sexprs, b);

      classValue.push(...sexprs);
    }
  });

  let hash = b.hash();
  classPair.value = b.sexpr(b.path('concat'), classValue, hash);
}

function buildSexprs(microsyntax: string[][], sexprs: AST.Expression[], b: Builders) {
  for (let i = 0; i < microsyntax.length; i++) {
    let [propName, activeClass, inactiveClass] = microsyntax[i];
    let sexpr;

    // :my-class-name microsyntax for static values
    if (propName === '') {
      sexpr = b.string(activeClass);
    } else {
      let params: AST.Expression[] = [b.path(propName)];

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

function each<T>(list: T[], callback: (t: T, i: number) => void) {
  for (let i = 0; i < list.length; i++) {
    callback(list[i], i);
  }
}

function parseMicrosyntax(string: string): string[][] {
  let segments = string.split(' ');
  let ret: string[][] = [];

  for (let i = 0; i < segments.length; i++) {
    ret[i] = segments[i].split(':');
  }

  return ret;
}
