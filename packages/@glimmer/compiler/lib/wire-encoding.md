# Encoded wire format

The entire wire format is encoded using the characters that are valid in a JSON string.

```
'0' 0x00 0000000
'1' 0x01 0000001
'2' 0x02 0000010
'3' 0x03 0000011
'4' 0x04 0000100
'5' 0x05 0000101
'6' 0x06 0000110
'7' 0x07 0000111
'8' 0x08 0001000
'9' 0x09 0001001
'A' 0x0A 0001010
'B' 0x0B 0001011
'C' 0x0C 0001100
'D' 0x0D 0001101
'E' 0x0E 0001110
'F' 0x0F 0001111
'G' 0x10 0010000
'H' 0x11 0010001
'I' 0x12 0010010
'J' 0x13 0010011
'K' 0x14 0010100
'L' 0x15 0010101
'M' 0x16 0010110
'N' 0x17 0010111
'O' 0x18 0011000
'P' 0x19 0011001
'Q' 0x1A 0011010
'R' 0x1B 0011011
'S' 0x1C 0011100
'T' 0x1D 0011101
'U' 0x1E 0011110
'V' 0x1F 0011111
'W' 0x20 0100000
'X' 0x21 0100001
'Y' 0x22 0100010
'Z' 0x23 0100011
'a' 0x24 0100100
'b' 0x25 0100101
'c' 0x26 0100110
'd' 0x27 0100111
'e' 0x28 0101000
'f' 0x29 0101001
'g' 0x2A 0101010
'h' 0x2B 0101011
'i' 0x2C 0101100
'j' 0x2D 0101101
'k' 0x2E 0101110
'l' 0x2F 0101111
'm' 0x30 0110000
'n' 0x31 0110001
'o' 0x32 0110010
'p' 0x33 0110011
'q' 0x34 0110100
'r' 0x35 0110101
's' 0x36 0110110
't' 0x37 0110111
'u' 0x38 0111000
'v' 0x39 0111001
'w' 0x3A 0111010
'x' 0x3B 0111011
'y' 0x3C 0111100
'z' 0x3D 0111101
'!' 0x3E 0111110
'#' 0x3F 0111111
'$' 0x40 1000000
'%' 0x41 1000001
'&' 0x42 1000010
'(' 0x43 1000011
')' 0x44 1000100
'*' 0x45 1000101
'+' 0x46 1000110
',' 0x47 1000111
'-' 0x48 1001000
'.' 0x49 1001001
'/' 0x4A 1001010
':' 0x4B 1001011
';' 0x4C 1001100
'<' 0x4D 1001101
'=' 0x4E 1001110
'>' 0x4F 1001111
'?' 0x50 1010000
'@' 0x51 1010001
'[' 0x52 1010010
']' 0x53 1010011
'^' 0x54 1010100
'_' 0x55 1010101
'`' 0x56 1010110
'{' 0x57 1010111
'|' 0x58 1011000
'}' 0x59 1011001
'~' 0x5A 1011010
```

In terms of bit patterns, anything from 0b000000 to 0b111111
(0x00 to 0x3F) can be represented directly.

The remaining available characters (0x40 to 0x5A) don't have a
very useful bit representation, but can be used to represent
standalone values between 0 and 90 and the high bit flag can be
used on values between 0 and 26 (0x00 to 0x1a).

Generally speaking, chars are assumed to encode 6 bits, except
when otherwise explicitly stated.

# Terms

- "Literal number" means a number between 0 and 90, encoded as the character corresponding to that number

# Program Structure

```
<flags> one char
; strings
<offset> offset of the end of the string section
<strings> N strings encoded as string primitives
; symbols
<offset> offset of the end of the symbols section
<strings> N strings encoded as string primitives
; upvars if has upvars flag
<offset> offset of the end of the upvars section
<strings> N strings encoded as string primitives
; statements
<statements> N statements terminated with EOF
```

## Flags

| 0        | 1        | 2        | 3        | 4          | 5       |
| -------- | -------- | -------- | -------- | ---------- | ------- |
| reserved | reserved | reserved | reserved | has upvars | hasEval |

# Expression

An expression's first byte is 6 boolean flags (named `flag0`,
`flag1`, etc.).

`flag0` is always `1` if the expression is a primitive and `0`
if the expression is a tuple-type.

## Primitives

Primitives are strings, numbers, booleans, null and undefined.

| type             | tag |
| ---------------- | --- |
| boolean          | 001 |
| null / undefined | 010 |
| string           | 101 |
| number           | 110 |

The bit pattern of a primitive is:

```
1 TAG REPR
| |   |
| |   | the last two bits are type-specific representation
| | the tag is a three-bit representation of the primitive type
| a primitive always starts with "1"
```

### Booleans (tag 001)

| value | repr |
| ----- | ---- |
| false | 00   |
| true  | 01   |

### Null and Undefined (tag 010)

| value     | repr |
| --------- | ---- |
| null      | 00   |
| undefined | 01   |

## Strings (tag 101)

| value                       | repr |
| --------------------------- | ---- |
| `"` terminated              | 00   |
| `"` terminated with escapes | 01   |
| interned < 90               | 10   |
| interned > 90               | 11   |

A string's tag is followed a sequence of literal characters terminated by `"`. If the escapes flag is set, `\"` means a literal `"` rather than a terminated string.

> This allows string literals without escapes to be encoded efficiently, while still allowing string literals with escapes to be encoded easily.

If the interned flag is set, the subsequent char corresponds to a position in the interned strings section. If the interned position is less than 90, the position is encoded as a literal number. Otherwise, it's encoded as a primitive number.

> Positions refer to a position in the interned string array, not a byte offset in the interned string section.

This string:

```
"hello world"
```

Would be encoded as:

```
qhello world"
```

"q" corresponds to `0x34`, the bit pattern `110100`.

- `1` - the primitive flag
- `101` - the string tag
- `00` - `"` terminated without escapes

### Numbers (tag 110)

| range   | repr |
| ------- | ---- |
| 0-90    | 00   |
| 91-180  | 01   |
| 181-270 | 10   |
| 271+    | 11   |

Very small numbers are encoded by using the representation flag to indicate which range of 90 numbers is represented, and then using the immediate next char to encode the full range of 90 supported by our character set.

Numbers larger than 270 are represented by a sequence of 6-bit numbers, terminated by 0x5A.

For example, the number 1000 has the bit pattern:

```
1111101000
```

This can be divided into:

```
001111 101000
(0x0F) (0x28)
```

Which is encoded as:

```
111011 001111 101000 1011010
(0x3b) (0x0F) (0x28) (0x5A)
x      F      e      ~
```

So the number 1000 encodes as `xFe~`.

This is no worse in bytes than `1000`.

For example, the number 123456789 has the bit pattern:

```
111010110111100110100010101
```

This can be divided into:

```
000111 010110 111100 110100 010101
(0x07) (0x16) (0x3c) (0x34) (0x15)
```

Which is encoded as:

```
111011 000111 010110 111100 110100 010101 1011010
(0x3b) (0x07) (0x16) (0x3c) (0x34) (0x15) (0x5A)
x      7      M      y      q      L      ~
```

So the number 123456789 encodes as `x7MyqL~`, which is better than the byte size of the original number.

> We could have encoded the numbers as Base89 and terminated them with `~`. If this turns out to matter a lot, we could revisit alternative encodings.

## Tuple Expressions

| type                | tag |
| ------------------- | --- |
| GetSymbol           | 000 |
| GetFreeWithContext  | 001 |
| GetLexicalFree      | 010 |
| GetCompatNeededFree | 011 |
| GetPath             | 100 |
| Concat              | 101 |
| Keyword             | 110 |
| Call                | 111 |

The bit pattern of a tuple expression is

```
0 TAG VARIANT
| |      |
| |      | the last two bits are type-specific representation
| | the tag is a three-bit representation of the expression type
| a tuple expression always starts with "0"
```

### GetSymbol (000)

```
(GetSymbol number)
```

`GetSymbol`'s `repr` is the same as primitive numbers. The chars immediately following the opcode are the symbol's number, encoded the same way as primitive numbers.

```
(GetSymbol 0)
; represents `self`
```

is encoded as:

```
000000 000000
(0x00) (0x00)

-> "00"
```

```
(GetSymbol 10)
```

is encoded as:

```
000000 001010
(0x00) (0x0A)

"0A"
```

### GetFreeWithContext (001)

The `repr` in `GetFreeWithContext` corresponds to the context.

| context   | repr |
| --------- | ---- |
| Call      | 00   |
| Block     | 01   |
| Modifier  | 10   |
| Component | 11   |

```
(GetFreeWithContext number context)
```

The `number` is encoded like a primitive number.

```
(GetFreeWithContext 0 Call)
```

```
|> GetFreeWithContext Call
|      |> number 0-19
|      |      |> 0
000100 111000 000000
(0x04) (0x38) (0x00)

-> "4u0"
```

```
(GetFreeWithContext 25 Call)
```

```
|> GetFreeWithContext Call
|      |> number 0-19
|      |      |> 25
000100 111000 011001
(0x04) (0x38) (0x19)

-> "4uP"
```

### GetLexicalFree (010)

This corresponds to a free variable in lexical scope.

This is encoded just like `GetFreeWithContext`.

### GetCompatNeededFree (011)

This corresponds to a free variable that would fall back to a property lookup on `this` in classic mode.

This is encoded just like `GetFreeWithContext`.

### GetPath (100)

`GetPath` is immediately followed by a head: `GetSymbol`, `GetFree` or `GetFreeWithContext`.

| parts | repr |
| ----- | ---- |
| 1     | 00   |
| 2     | 01   |
| 3-90  | 10   |
| 91+   | 11   |

If a path has one or two parts, the head is immediately followed by that number of strings, encoded as string primitives.

If a path has `3-90` parts, the head is followed by a number of parts, encoded as a literal number, and followed by that many string primitives.

If a path has more than 90 parts, the head is followed by a number of parts, encoded as a primitive number, and followed by that many string primitives.

### Concat (101)

| parts | repr |
| ----- | ---- |
| 1     | 00   |
| 2     | 01   |
| 3-90  | 10   |
| 91+   | 11   |

> Even though concatenating exactly one part is weird, programs wrap attributes in `""` to force them into strings.

If a concat has one or two parts, the tag is immediately followed by that number of encoded expressions.

If a path has `3-90` parts, the tag is followed by a number of expressions, encoded as a literal number, and followed by that many encoded expressions.

If a path has more than 90 parts, the tag is followed by a number of parts, encoded as a primitive number, and followed by that many encoded expressions.

### Keyword (101)

| keyword        | repr |
| -------------- | ---- |
| HasBlock       | 00   |
| HasBlockParams | 01   |

The tag is immediately followed by a single encoded expression.

### Call (111)

| positional arguments | named arguments | repr |
| -------------------- | --------------- | ---- |
| 0                    | 0               | 00   |
| 1                    | 0               | 10   |
| 0                    | 1               | 01   |
| other                | other           | 11   |

The tag is always immediately followed by a single encoded expression.

If there are 0 positional arguments and zero named arguments, the head is the end of the expression.

If there is one positional argument and 0 named arguments, the head is immediately followed by one encoded expression.

If there are zero positional arguments, and 1 named argument, the head is immediately followed by one encoded named argument (see below).

Otherwise, encode the arguments as follows.

#### Arguments

Arguments start with a header, describing the number of arguments, followed immediately by the encoded arguments.

For example, if the header says that there are two positional arguments and five named arguments, it will be immediately followed by two encoded expressions and five encoded named arguments.

The header:

```
|> A tag, corresponding to the number of args
|   |> the number of arguments
TAG AMOUNT
```

| positional arguments | named arguments | tag | amount                                                                                                                       |
| -------------------- | --------------- | --- | ---------------------------------------------------------------------------------------------------------------------------- |
| < 3                  | < 3             | 00  | two bits for positional, two bits for named                                                                                  |
| < 15                 | 0               | 01  | four bits for positional                                                                                                     |
| 0                    | < 15            | 10  | four bits for named                                                                                                          |
| other                | other           | 11  | number of positional arguments, encoded as a primitive number, then number of named arguments, encoded as a primitive number |

#### Named Argument

A named argument is encoded as a single string primitive, immediately followed by a single encoded expression.

## Top-Level Statements

Top-level statements have the same structure as expressions, but without a leading flag. This gives them three bits of repr information.

| type          | tag |
| ------------- | --- |
| Append        | 000 |
| StaticContent | 001 |
| Element       | 010 |
| Attribute     | 011 |
| Modifier      | 100 |
| Block         | 101 |
| Keyword       | 110 |
| Terminate     | 111 |

### Statement List

A statement list is a list of statements, one after another, terminated by `111000` (0x38 = `'u'`)

### Append (000)

| trusted | repr |
| ------- | ---- |
| yes     | 001  |
| no      | 000  |

`Append` is immediately followed by a single encoded expression.

### StaticContent (001)

| kind    | repr |
| ------- | ---- |
| text    | 000  |
| comment | 001  |

### Element (010)

| operation  | repr |
| ---------- | ---- |
| open       | 000  |
| flush      | 001  |
| open-flush | 010  |
| close      | 100  |

If operation is `open` or `open-flush`, the tag is immediately followed by a primitive string.

If operation is `flush` or `close`, nothing follows the tag.

If operation is `open-flush`, it's interpreted as an open, immediately followed by a flush.

### Attribute (011)

| kind                   | repr |
| ---------------------- | ---- |
| static                 | 000  |
| static w/ namespace    | 100  |
| dynamic                | 010  |
| dynamic w/ namespace   | 110  |
| component              | 011  |
| component w/ namespace | 111  |

The attribute name, a primitive string, immediately follows the tag.

If the namespace bit is on, the namespace, another primitive string, immediately follows the attribute name.

If `kind` is `static` or `static w/ namespace`, the value, another primitive string, immediately follows.

Otherwise, an encoded expression follows.

### Modifier (100)

Modifier is encoded exactly the same way as the Call expression.

### Block (101)

| positional arguments | named arguments | block args | repr |
| -------------------- | --------------- | ---------- | ---- |
| 0                    | 0               | 1          | 000  |
| 1                    | 0               | 1          | 001  |
| 0                    | 1               | 1          | 010  |
| other                | other           | 1+         | 011  |
| component            | 0               | 0          | 100  |
| component            | 0               | 1          | 101  |
| component            | 1               | 1          | 110  |
| component            | other           | other      | 111  |

Arguments are encoded just like Call.

If block args is 1, the arguments are followed by a block body.

Otherwise, the arguments are followed by:

```
{
  <name> primitive string
  <block> block body
}* ('&' terminated)
```

#### Block Body

| block params  | block tag | notes                                |
| ------------- | --------- | ------------------------------------ |
| 0             | 00        |                                      |
| 1 (small)     | 01        | the block param symbol must be <= 90 |
| 2 (small)     | 10        | both symbols must be <= 7            |
| 3+ (or large) | 11        |                                      |

If block params is 1 (small), the block tag is followed one literal number (the symbol for the block param).

If block params is 2 (small), the block tag is followed by one char. The first three bits correspond to the first block param and the second three bits correspond to the second block param.

Otherwise, the block tag is followed immediately by a primitive number, the count of block params, followed by that many primitive numbers.

The block params are immediately followed by a statement list.

### Keyword (111)

| keyword            | repr |
| ------------------ | ---- |
| yield              | 000  |
| yield to           | 001  |
| yield with args    | 010  |
| yield to with args | 011  |
| debugger           | 100  |
| splat              | 101  |

If repr is `yield`, the tag is followed by nothing.

If repr is `yield to`, the tag is followed by a literal number corresponding to the symbol containing the block.

If repr is `yield with args`, the tag is followed by encoded arguments.

If repr is `yield to with args`, the tag is followed a literal number corresponding to the symbol containing the block, and then followed by encoded arguments.

If repr is `debugger` or `splat`, the tag is followed by nothing.

# Example

Glimmer Playground Example:

```
<h1>Welcome to the Glimmer Playground!</h1>
<p>You have clicked the button {{count}} times.</p>
<button onclick={{action increment}}>Click</button>
```

Wire Format:

```json
{
  "statements": [
    [9, "h1", true][10],
    [1, "Welcome to the Glimmer Playground!", true],
    [11],
    [9, "p", true],
    [10],
    [1, "You have clicked the button ", true],
    [1, [26, 0, "AppendSingleId"], false], // this string isn't right
    [1, " times", true],
    [11],
    [9, "button", true],
    [18, "onclick", [31, [25, 1], [[25, 2]]]],
    [10],
    [1, "Click", true][11]
  ],
  "upvars": ["count", "action", "increment"]
}
```

This proposal:

```
2qcount"qaction"qincrement"Iqh1"8qWelcome to the Glimmer Playground!"HIp"8q"You have clicked the button "0C08q times"HGbutton"Qonclick"UCaction"Cincrement"H8qClick"I
```

Square:

```
2qcount"qaction
"qincrement"Iqh
1"8qWelcome to·
the Glimmer Pla
yground!"HIp"8q
"You have click
ed the button "
0C08q times"HGb
utton"Qonclick"
UCaction"Cincre
ment"H8qClick"I
```
