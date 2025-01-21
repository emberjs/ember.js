# Recommended VSCode Workflows

This file outlines recommendations for developing packages in this repository using Visual Studio
Code (or any other editor based on vscode).

## Recommended Extensions

The `.vscode/extensions.json` file lists a number of extensions that help you take the most
advantage of the repository's setup and source code.

> [!TIP]
>
> Visual Studio Code will notify you if any of the extensions listed in the file are not
> installed. The easiest way to install these extensions is to approve the prompt. Otherwise, you
> will find the extensions listed under "Recommended" in the Extensions view.

### Format Code Action (`rohit-gohri.format-code-action`)

This repository is configured to use [code
actions](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings)
to autofix ESLint issues and format the source code.

The Format Code Action extension allows us to run prettier as a code action, so we can specify the
order of formatting and lint fixing.

> [!TIP]
>
> We intentionally don't configure ESLint to run prettier as an autofix, for [reasons described by
> the TypeScript ESLint docs](https://typescript-eslint.io/users/what-about-formatting).
>
> TL;DR The linting cycle, especially with type checking enabled, is much slower than formatting,
> and we want formatting to run instantly even if linting is slow.

### Prettier (`esbenp.prettier-vscode`)

This repository is configured to use Prettier as the default formatter for JavaScript, TypeScript,
JSON, Markdown and YAML files.

Installing this extension will format the source code when you save a source file, before applying
lint fixes.

### ESLint (`dbaeumer.vscode-eslint`)

This repository is configured to use ESLint to lint JavaScript, TypeScript, and JSON files.

This extension will:

- Give you squiggly lines when you have a lint error.

> [!NOTE]
>
> Our linting setup makes heavy use of type checking and module resolution, which allows us to
> automate quite a bit of code maintenance via autofixes.
>
> For example, autofixes will automatically sort, group and manage `import type` for you when you
> save.

<details>
<summary>Autofix Demo</summary>

<kbd> ![linting](./demos/auto-import.gif) </kbd>

</details>

The linting setup will also sort your package.json files to match the consistent repository
standard, remove unnecessary type assertions and generics that match the default, and much, much more.

### Inline Bookmarks (`tintinweb.vscode-inline-bookmarks`)

This extension highlights standard repository annotations like `@active`, `@fixme` and `@premerge`.

See [Standard Annotations](./workspace-management.md#standard-annotations) in `workspace-management.md` for more information.

<kbd> ![fixme](./demos/fixme.png) </kbd>



### NPM Dependency Links (`herrmannplatz.npm-dependency-links`)

This extension will turn your dependencies and devDependencies in your `package.json` into links to
the NPM package, which will open the package in the browser.

<kbd> ![npm-dependency-links](./demos/dependency-links.png) </kbd>

### Dependi (`fill-labs.dependi`)

This extension will show you whether dependencies are up to date in your `package.json` file.

<kbd> ![dependi](./demos/dependi-outdated.png) </kbd>

It will also allow you to see the available updated versions and click on them to update the
`package.json` file.

<kbd> ![dependi](./demos/dependi-update.png) </kbd>
