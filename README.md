<p align="center">
<img src="https://github.com/AnWeber/vscode-swapf/raw/main/icon.png" alt="SwapF" />
</p>
# SwapF

swap between related files

## Features

- swap between related files with command or editor title button (Keybinding CTRL+B)
- allow configuration of swap patterns
- create missing File, for which a swap is configured (Keybinding CTRL+I)

## Default Swap Patterns

### NodeJS File Structure

Allow swapping between `ts`, `js`, `html`, `css`, `spec.ts`, ... with same file name

```json
[
  {
    "pattern": "^(?<path>.*?)(ts|js|css|sass|scss|html|spec.ts|spec.js|test.js|test.ts)$",
    "alternatives": ["**/<path>{ts,js,css,sass,scss,html,spec.js,spec.ts}"]
  }
]
```

### Java File Structure

Allow swapping between Java Source and Java Test File

```json
[
  {
    "pattern": "^(?<rootPath>.*?)(main|test)(?<path>.*?)(Test)?.(java|kt)$",
    "alternatives": ["**/<rootPath>{main,test}<path>*.{java,kt}"]
  }
]
```

### Header and Source

Allow swapping between Header and Source File

```json
[
  {
    "pattern": "^(?<path>.*?)(cpp|c|cc|cxx|m|mm|h|hpp|hh|hxx)$",
    "alternatives": ["**/<path>{cpp,c,cc,cxx,m,mm,h,hpp,hh,hxx}"]
  }
]
```

### CS Source and Designer File

Allow swapping between C# Source File and Additional Designer File

```json
[
  {
    "pattern": "^(?<path>.*?)(cs)$",
    "alternatives": ["**/<path>cs", "**/<path>*.cs"]
  }
]
```

### Same Filename

Allow swapping between same file name, like `package.json`

```json
[
  {
    "pattern": "^.*?(?<file>[^/]*)$",
    "alternatives": ["**/<file>"]
  }
]
```

## How to configure on my own

- open VSCode settings and change `swapf.patterns`
- `pattern` needs to be a valid Regexp
- all named groups in pattern replaces `<named_group>` in alternative
- alternative are used as [VSCode GlobPattern](https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
- To get feedback during testing the OutputChannel SwapF can be used

## License

[MIT License](LICENSE)

## Change Log

[CHANGELOG](CHANGELOG.md)
