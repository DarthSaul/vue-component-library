# Icons Library

This is a placeholder for the icons library.

## Future Implementation

This directory will contain SVG icons that can be used with the component library.

Example structure:
```
icons/
  src/
    arrow-left.svg
    arrow-right.svg
    check.svg
    close.svg
    ...
```

## Tooling

### `utils/dedupe-icons.js`

Audits a flattened icon directory (`icons/flat/` by default, with collisions
from `flatten-icons.js` sitting in `icons/flat/duplicates/`) and works out which
files are genuinely the same icon.

Every SVG is normalized with SVGO **in memory** and hashed, so files are grouped
by what they draw rather than what they are named. Nothing on disk is touched
unless `--apply` is passed.

```bash
# 1. Report only — writes dedupe-report.json + dedupe-contact-sheet.html
node icons/utils/dedupe-icons.js

# 2. Review, then apply the decisions recorded in the report
node icons/utils/dedupe-icons.js --apply
```

Each group is classified as:

| Classification    | Meaning                                    | Action                                  |
| ----------------- | ------------------------------------------ | --------------------------------------- |
| `CLEAN`           | One file, name used by nothing else        | None                                    |
| `TRUE_DUPLICATE`  | Same art, same claimed name                | Keep one, delete the rest               |
| `ALIAS`           | Same art filed under different names       | You pick `canonicalName`                |
| `FALSE_DUPLICATE` | Different art claiming the same name       | You pick a `canonicalName` per variant  |

`ALIAS` and `FALSE_DUPLICATE` groups are written out with an empty
`canonicalName` field. Fill those in, then run `--apply`; it refuses to touch
anything while any required name is still blank, if two groups resolve to the
same filename, or if a file has changed since the report was generated.

Open `dedupe-contact-sheet.html` to review those groups visually — it renders
every variant side by side with its filename and any baked-in paint values, and
has a background toggle so icons that are invisible against one background can
still be checked.

The report also flags icons that will **not** respond to a CSS `color` override
through a sprite's `<use>` boundary — both those with hardcoded paint and those
carrying no paint at all (which inherit the black default). That list is the
input to the `currentColor` conversion work.

Options:

| Flag                         | Default                      | Description                            |
| ---------------------------- | ---------------------------- | -------------------------------------- |
| `-s, --source <dir>`         | `flat`                       | Flat icon directory, relative to `icons/` |
| `-r, --report <file>`        | `dedupe-report.json`         | Report path, relative to `icons/`      |
| `-c, --contact-sheet <file>` | `dedupe-contact-sheet.html`  | Contact sheet path, relative to `icons/` |
| `--apply`                    | off                          | Execute the report's removals and renames |
