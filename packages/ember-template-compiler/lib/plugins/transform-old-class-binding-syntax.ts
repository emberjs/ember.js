import { deprecate } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { Builders, EmberASTPluginEnvironment } from '../types';

export default function transformOldClassBindingSyntax(env: EmberASTPluginEnvironment): ASTPlugin {
  let b = env.syntax.builders;
  let moduleName = env.meta?.moduleName;

  return {
    name: 'transform-old-class-binding-syntax',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement) {
        process(b, node, moduleName);
      },

      BlockStatement(node: AST.BlockStatement) {
        process(b, node, moduleName);
      },
    },
  };
}

function process(
  b: Builders,
  node: AST.BlockStatement | AST.MustacheStatement,
  moduleName: string | undefined
) {
  let allOfTheMicrosyntaxes: AST.HashPair[] = [];
  let allOfTheMicrosyntaxIndexes: number[] = [];
  let classPair: AST.HashPair | undefined;

  each(node.hash.pairs, (pair, index) => {
    let { key } = pair;

    if (key === 'classBinding' || key === 'classNameBindings') {
      deprecate(
        `Passing the \`${key}\` property as an argument within templates has been deprecated. Instead, you can pass the class argument and use concatenation to produce the class value dynamically. ${calculateLocationDisplay(
          moduleName,
          node.loc
        )}`,
        false,
        {
          id: 'class-binding-and-class-name-bindings-in-templates',
          url:
            'https://deprecations.emberjs.com/v3.x/#toc_class-binding-and-class-name-bindings-in-templates',
          until: '4.0.0',
          for: 'ember-source',
          since: {
            enabled: '3.26.0',
          },
        }
      );

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

  each(allOfTheMicrosyntaxIndexes, (index) => {
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
