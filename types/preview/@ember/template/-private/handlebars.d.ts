declare module '@ember/template/-private/handlebars' {
  export class SafeString {
    constructor(str: string);
    toString(): string;
    toHTML(): string;
  }
}
