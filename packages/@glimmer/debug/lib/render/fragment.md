There are four kinds of basic fragments:

- `string`: a fragment that contains a string
- `integer`: a fragment that contains an integer
- `dom`: a fragment that contains a value
- `value`: a fragment that contains any value

There is also a `multi` type, which is a fragment that contains one or more fragments.

Each leaf fragment type corresponds to a `console.log` [format specifier]:

| Type      | Formatter |
| --------- | --------- |
| `string`  | `%s`      |
| `integer` | `%d`      |
| `float`   | `%f`      |
| `dom`     | `%o`      |
| `value`   | `%O`      |

> [!NOTE]
>
> While `%o` is described in the _spec_ as "optimally useful formatting", it is documented in [the Chrome documentation] as "Formats the value as an expandable DOM element", which is a closer reflection of reality.

[format specifier]: https://console.spec.whatwg.org/#formatting-specifiers
[the Chrome documentation]: https://developer.chrome.com/docs/devtools/console/format-style#multiple-specifiers

## Subtle Logging
