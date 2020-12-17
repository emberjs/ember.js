import { CurriedType } from '@glimmer/interfaces';

import { keywords } from './impl';
import { curryKeyword } from './utils/curry';
import { getDynamicVarKeyword } from './utils/dynamic-vars';
import { hasBlockKeyword } from './utils/has-block';
import { ifUnlessInlineKeyword } from './utils/if-unless';
import { logKeyword } from './utils/log';

export const CALL_KEYWORDS = keywords('Call')
  .kw('has-block', hasBlockKeyword('has-block'))
  .kw('has-block-params', hasBlockKeyword('has-block-params'))
  .kw('-get-dynamic-var', getDynamicVarKeyword)
  .kw('log', logKeyword)
  .kw('if', ifUnlessInlineKeyword('if'))
  .kw('unless', ifUnlessInlineKeyword('unless'))
  .kw('component', curryKeyword(CurriedType.Component))
  .kw('helper', curryKeyword(CurriedType.Helper))
  .kw('modifier', curryKeyword(CurriedType.Modifier));
