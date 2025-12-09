import type { StyleName } from './styles';

import { STYLES } from './styles';

export type Format = { style: string };
export type IntoFormat = { style: string } | StyleName;

export function intoFormat(format: IntoFormat): Format {
  if (typeof format === 'string') {
    return { style: STYLES[format] };
  } else {
    return format;
  }
}

export function formats(...formats: IntoFormat[]) {
  return formats.map((c) => intoFormat(c).style).join('; ');
}
