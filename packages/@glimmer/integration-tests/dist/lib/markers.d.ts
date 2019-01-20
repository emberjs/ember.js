export declare const OPEN: {
    marker: 'open-block';
};
export declare const CLOSE: {
    marker: 'close-block';
};
export declare const SEP: {
    marker: '|';
};
export declare const EMPTY: {
    marker: ' ';
};
export declare type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;
export declare function content(list: Content[]): string;
//# sourceMappingURL=markers.d.ts.map