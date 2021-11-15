# base64-arraybuffer-es6

## 0.5.0

- Breaking change: Drop yarn
- Linting: Switch away from deprecated no-extension `.eslintrc` to add `.js`
- Testing: Switch from nodeunit to Mocha/Chai
- Testing: Use CLI instead of programmatic server; use open-cli to open file
- Build: Add browserslist
- npm: Add `core-js-bundle` to `peerDependencies`
- npm: Update devDeps

## 0.4.2

- Fix: Overcome Safari's idiosyncrasies with `Uint8Array` constructor
    (@dfahlander).

## 0.4.1

- Fix `.npmignore` to include proper files in package

## 0.4.0

- Breaking change: Point to `dist` ES version for `module`; browser versions
    should reference this
- Linting (ESLint): Add .eslintignore file; override "object-curly-spacing"
    for new "standard"; avoid Node-deprecated `url.parse`
- npm: Update Babel 7, other devDeps

## 0.3.1

- Fix `.npmignore`

## 0.3.0

- Build: Add Yarn

## 0.2.0

- Build: Use non-deprecated env over es2015; remove unused babel-loader
- npm: Update devDeps (rollup, eslint)

## 0.1.0 (First version adapted from [base64-arraybuffer](https://github.com/niklasvh/base64-arraybuffer))

- Refactoring/Build: Convert to ES6 source and apply Rollup with
    Babel to get UMD
- npm: Add `module` property for ES6 module compilation
- Build: Remove Grunt, add file extensions
- Docs: Add CHANGES file, add project info to README
- Linting: Switch to eslint
- Linting: Add for Markdown
- Testing: Add browser test
- travis: Remove travis file
- .gitignore: Avoid ignoring `test/`
