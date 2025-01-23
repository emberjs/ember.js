// inspired by https://github.com/ChromeDevTools/devtools-frontend/blob/c2c17396c9e0da3f1ce6514c3a946f88a06b17f2/front_end/ui/legacy/themeColors.css#L65
export const STYLES = {
  var: 'color: grey',
  varReference: 'color: blue; text-decoration: underline',
  varBinding: 'color: blue;',
  specialVar: 'color: blue',
  prop: 'color: grey',
  specialProp: 'color: red',
  token: 'color: green',
  def: 'color: blue',
  builtin: 'color: blue',
  punct: 'color: GrayText',
  kw: 'color: rgb(185 0 99 / 100%);',
  type: 'color: teal',
  number: 'color: blue',
  string: 'color: red',
  null: 'color: grey',
  specialString: 'color: darkred',
  atom: 'color: blue',
  attrName: 'color: orange',
  attrValue: 'color: blue',
  boolean: 'color: blue',
  comment: 'color: green',
  meta: 'color: grey',
  register: 'color: purple',
  constant: 'color: purple',
  dim: 'color: grey',
  internals: 'color: lightgrey; font-style: italic',

  diffAdd: 'color: Highlight',
  diffDelete: 'color: SelectedItemText; background-color: SelectedItem',
  diffChange: 'color: MarkText; background-color: Mark',

  sublabel: 'font-style: italic; color: grey',
  error: 'color: red',
  label: 'text-decoration: underline',
  errorLabel: 'color: darkred; font-style: italic',
  errorMessage: 'color: darkred; text-decoration: underline',
  stack: 'color: grey; font-style: italic',
  unbold: 'font-weight: normal',
  pointer: 'background-color: lavender; color: indigo',
  pointee: 'background-color: lavender; color: indigo',
  focus: 'font-weight: bold',
  focusColor: 'background-color: lightred; color: darkred',
} as const;

export type StyleName = keyof typeof STYLES;

export function mergeStyle(a?: string, b?: string): string | undefined {
  if (a && b) {
    return `${a}; ${b}`;
  } else {
    return a || b;
  }
}
