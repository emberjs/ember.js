import { ASTv2, maybeLoc, SourceSpan } from '@glimmer/syntax';

import { OptionalList } from '../../../../shared/list';
import { Ok, Result, ResultArray } from '../../../../shared/result';
import { getAttrNamespace } from '../../../../utils';
import * as mir from '../../../2-encoding/mir';
import { NormalizationState } from '../../context';
import { MODIFIER_KEYWORDS } from '../../keywords';
import { assertIsValidHelper, isHelperInvocation } from '../../utils/is-node';
import { convertPathToCallIfKeyword, VISIT_EXPRS } from '../expressions';

export type ValidAttr = mir.StaticAttr | mir.DynamicAttr | mir.SplatAttr;

type ProcessedAttributes = {
  attrs: ValidAttr[];
  args: mir.NamedArguments;
};

export interface Classified {
  readonly dynamicFeatures: boolean;

  arg(attr: ASTv2.AttrNode, classified: ClassifiedElement): Result<mir.NamedArgument>;
  toStatement(classified: ClassifiedElement, prepared: PreparedArgs): Result<mir.Statement>;
}

export class ClassifiedElement {
  readonly delegate: Classified;

  constructor(
    readonly element: ASTv2.ElementNode,
    delegate: Classified,
    readonly state: NormalizationState
  ) {
    this.delegate = delegate;
  }

  toStatement(): Result<mir.Statement> {
    return this.prepare().andThen((prepared) => this.delegate.toStatement(this, prepared));
  }

  private attr(attr: ASTv2.HtmlAttr): Result<ValidAttr> {
    let name = attr.name;
    let rawValue = attr.value;
    let namespace = getAttrNamespace(name.chars) || undefined;

    if (ASTv2.isLiteral(rawValue, 'string')) {
      return Ok(
        new mir.StaticAttr({
          loc: attr.loc,
          name,
          value: rawValue.toSlice(),
          namespace,
          kind: {
            component: this.delegate.dynamicFeatures,
          },
        })
      );
    }

    return VISIT_EXPRS.visit(convertPathToCallIfKeyword(rawValue), this.state).mapOk((value) => {
      let isTrusting = attr.trusting;

      return new mir.DynamicAttr({
        loc: attr.loc,
        name,
        value: value,
        namespace,
        kind: {
          trusting: isTrusting,
          component: this.delegate.dynamicFeatures,
        },
      });
    });
  }

  private modifier(modifier: ASTv2.ElementModifier): Result<mir.Modifier> {
    if (isHelperInvocation(modifier)) {
      assertIsValidHelper(modifier, 'modifier');
    }

    let translated = MODIFIER_KEYWORDS.translate(modifier, this.state);

    if (translated !== null) {
      return translated;
    }

    let head = VISIT_EXPRS.visit(modifier.callee, this.state);
    let args = VISIT_EXPRS.Args(modifier.args, this.state);

    return Result.all(head, args).mapOk(
      ([head, args]) =>
        new mir.Modifier({
          loc: modifier.loc,
          callee: head,
          args,
        })
    );
  }

  private attrs(): Result<ProcessedAttributes> {
    let attrs = new ResultArray<ValidAttr>();
    let args = new ResultArray<mir.NamedArgument>();

    // Unlike most attributes, the `type` attribute can change how
    // subsequent attributes are interpreted by the browser. To address
    // this, in simple cases, we special case the `type` attribute to be set
    // last. For elements with splattributes, where attribute order affects
    // precedence, this re-ordering happens at runtime instead.
    // See https://github.com/glimmerjs/glimmer-vm/pull/726
    let typeAttr: ASTv2.AttrNode | null = null;
    let simple = true;

    for (let attr of this.element.attrs) {
      if (attr.type === 'SplatAttr') {
        simple = false;
        attrs.add(
          Ok(new mir.SplatAttr({ loc: attr.loc, symbol: this.state.scope.allocateBlock('attrs') }))
        );
      } else if (attr.name.chars === 'type' && !simple) {
        typeAttr = attr;
      } else {
        attrs.add(this.attr(attr));
      }
    }

    for (let arg of this.element.componentArgs) {
      args.add(this.delegate.arg(arg, this));
    }

    if (typeAttr) {
      attrs.add(this.attr(typeAttr));
    }

    return Result.all(args.toArray(), attrs.toArray()).mapOk(([args, attrs]) => ({
      attrs,
      args: new mir.NamedArguments({
        loc: maybeLoc(args, SourceSpan.NON_EXISTENT),
        entries: OptionalList(args),
      }),
    }));
  }

  private prepare(): Result<PreparedArgs> {
    let attrs = this.attrs();
    let modifiers = new ResultArray(this.element.modifiers.map((m) => this.modifier(m))).toArray();

    return Result.all(attrs, modifiers).mapOk(([result, modifiers]) => {
      let { attrs, args } = result;

      let elementParams = [...attrs, ...modifiers];

      let params = new mir.ElementParameters({
        loc: maybeLoc(elementParams, SourceSpan.NON_EXISTENT),
        body: OptionalList(elementParams),
      });

      return { args, params };
    });
  }
}

export interface PreparedArgs {
  args: mir.NamedArguments;
  params: mir.ElementParameters;
}

export function hasDynamicFeatures({
  attrs,
  modifiers,
}: Pick<ASTv2.ElementNode, 'attrs' | 'modifiers'>): boolean {
  // ElementModifier needs the special ComponentOperations
  if (modifiers.length > 0) {
    return true;
  }

  // Splattributes need the special ComponentOperations to merge into
  return !!attrs.filter((attr) => attr.type === 'SplatAttr')[0];
}
