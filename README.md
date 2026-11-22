# @micropasts/record-completeness

Zero-dependency JavaScript Web Components for scoring cultural heritage metadata records.

`@micropasts/record-completeness` evaluates a record against required and recommended fields, calculates a weighted completeness score, reports missing values, and emits structured selection events. It includes:

- A self-contained Shadow DOM component
- A Tailwind-oriented Light DOM component
- A framework-independent core API
- ESM and IIFE browser builds
- Custom schemas and custom Shadow DOM templates

The package is intended for museum, archaeological, archive, and collection interfaces, but it does not require a framework or a backend.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Providing record data](#providing-record-data)
- [Components](#components)
- [Completeness scoring](#completeness-scoring)
- [Custom schemas](#custom-schemas)
- [Events](#events)
- [JavaScript API](#javascript-api)
- [Shadow DOM customization](#shadow-dom-customization)
- [Browser builds](#browser-builds)
- [Development](#development)
- [Browser support](#browser-support)
- [License](#license)

## Installation

### npm

```bash
npm install @micropasts/record-completeness
```

```js
import '@micropasts/record-completeness';
```

The package uses native custom elements. The components are registered automatically for tag names that have not already been used.

### CDN

The IIFE build exposes `window.RecordCompletenessLib` and registers both custom elements.

```html
<script src="https://cdn.jsdelivr.net/npm/@micropasts/record-completeness/dist/record-completeness.iife.js"></script>
```

The ESM build can also be loaded directly:

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@micropasts/record-completeness/dist/record-completeness.esm.js';
</script>
```

## Quick start

For the default Shadow DOM component:

```html
<record-completeness>
  <script type="application/json">
    {
      "identifier": "PAS-SUR-12A901",
      "title": "Roman silver denarius of Trajan",
      "type": "Coin",
      "date": "AD 98-117",
      "place": "Near Farnham, Surrey",
      "description": "Silver denarius depicting Trajan.",
      "rights": "CC BY 4.0",
      "authorityUri": "https://nomisma.org/id/denarius"
    }
  </script>
</record-completeness>

<script type="module">
  import '@micropasts/record-completeness';
</script>
```

For the Light DOM component, which can be styled with Tailwind CSS or ordinary CSS:

```html
<record-completeness-tw>
  <script type="application/json">
    {
      "identifier": "EXC-2026-044",
      "title": "Copper-alloy brooches",
      "type": "Fibula",
      "rights": ""
    }
  </script>
</record-completeness-tw>

<script type="module">
  import '@micropasts/record-completeness';
</script>
```

## Providing record data

The recommended form is a nested `script[type="application/json"]` element. It keeps JSON separate from HTML attributes and allows complete nested objects or arrays.

```html
<record-completeness>
  <script type="application/json">
    {
      "identifier": "MCR-2026-001",
      "title": "Tested record",
      "creator": "Anonymised recorder",
      "rights": "CC0",
      "authorityUri": "http://vocab.getty.edu/page/aat/300037213"
    }
  </script>
</record-completeness>
```

A JSON `record` attribute is also accepted:

```html
<record-completeness
  record='{"identifier":"MCR-001","title":"Excavation register","rights":"CC BY 4.0"}'>
</record-completeness>
```

If both forms are present, the `record` attribute takes precedence. Invalid JSON in either source is treated as an empty record.

Records can be updated at runtime:

```js
const checker = document.querySelector('record-completeness');

checker.setRecord({
  identifier: 'MCR-002',
  title: 'Updated record',
  rights: 'CC BY 4.0',
  authorityUri: 'https://example.org/authorities/objects/002',
});
```

Both components support `setRecord(record)`. Values can be strings, numbers, booleans, arrays, or objects. Empty strings, whitespace, `null`, `undefined`, empty arrays, and objects with no populated values count as missing.

## Components

### `<record-completeness>`

The default component uses a Shadow DOM. Its interface is isolated from page styles and includes automatic light/dark theme support based on:

- `theme="light"`
- `theme="dark"`
- `prefers-color-scheme`, when no theme is forced

It is registered from `src/shadow.js` and exported as `RecordCompleteness`.

### `<record-completeness-tw>`

The Tailwind component renders into the element's Light DOM. It is designed to work with Tailwind utility classes while remaining usable with custom CSS.

An optional `card-class` attribute adds classes to the card:

```html
<record-completeness-tw card-class="shadow-lg max-w-md">
  <!-- JSON data -->
</record-completeness-tw>
```

The component is exported as `RecordCompletenessTailwind`.

## Completeness scoring

The default schema contains these fields:

| Key | Label | Weight | Required |
| --- | --- | ---: | :---: |
| `identifier` | Identifier | 15 | Yes |
| `title` | Title | 15 | Yes |
| `type` | Object / Record Type | 12 | Yes |
| `date` | Date / Period | 12 | Yes |
| `rights` | Rights / Licence | 10 | Yes |
| `place` | Provenance / Findspot | 12 | No |
| `description` | Description | 10 | No |
| `authorityUri` | Authority URI | 8 | No |
| `creator` | Creator / Recorder | 6 | No |

The score is the sum of weights for populated fields divided by the sum of all active schema weights:

```text
score = round(populated weight / total weight * 100)
```

The display status is determined as follows:

- **Complete**: no required fields are missing and the score is at least 85
- **Partial**: no required fields are missing, but the score is between 50 and 84 or a recommended field is missing
- **Needs Attention**: at least one required field is missing or the score is below 50

The default UI button:

- **Show Missing Only** hides populated fields
- **Show All Fields** restores the complete field list
- **Copy Summary** copies a plain-text audit summary
- **Emit Select** dispatches a selection event

## Custom schemas

Pass a schema array to `setSchema()` on `<record-completeness>`:

```js
const schema = [
  { key: 'id', label: 'Accession number', weight: 20, required: true },
  { key: 'title', label: 'Object title', weight: 20, required: true },
  { key: 'museum', label: 'Holding institution', weight: 15, required: true },
  { key: 'period', label: 'Period', weight: 10, required: false },
  { key: 'vocabUri', label: 'Controlled vocabulary URI', weight: 10, required: false },
];

document.querySelector('record-completeness').setSchema(schema);
```

Each schema item supports:

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string` | Property name read from the record |
| `label` | `string` | Human-readable field name |
| `weight` | `number` | Points contributed by the field |
| `required` | `boolean` | Whether a missing field blocks the **Complete** state |

An empty or invalid schema falls back to `DEFAULT_METADATA_SCHEMA`.

The Tailwind component currently uses the default schema. Use the core `evaluateCompleteness(record, schema)` function for custom schemas outside `<record-completeness>`.

## Events

The `heritage:select` event is emitted by the **Emit Select** button or by `emitRecordSelect()`.

```js
document.addEventListener('heritage:select', (event) => {
  console.log(event.detail);
});
```

The event bubbles and crosses the Shadow DOM boundary. Its detail is:

```js
{
  uri: '',
  identifier: '',
  title: '',
  completenessScore: 83,
  record: { /* original record object */ }
}
```

`uri` is read from `record.authorityUri`, then falls back to `record.uri`. Other values are populated from `record.identifier` and `record.title`.

Components can listen to an external custom event and adopt its `detail.record` value:

```html
<record-completeness listen="museum:selected"></record-completeness>
<record-completeness-tw listen="museum:selected"></record-completeness-tw>
```

```js
window.dispatchEvent(new CustomEvent('museum:selected', {
  detail: {
    record: {
      identifier: 'MCR-003',
      title: 'Selected object',
      rights: 'CC0',
    },
  },
}));
```

The listener is registered on `window` and removed when the component disconnects.

## JavaScript API

The package exports the core API, both component classes, and the default schema.

```js
import {
  DEFAULT_METADATA_SCHEMA,
  evaluateCompleteness,
  parseRecordData,
  emitRecordSelect,
  copyTextToClipboard,
  RecordCompleteness,
  RecordCompletenessTailwind,
} from '@micropasts/record-completeness';
```

Subpath imports are also available:

```js
import { evaluateCompleteness } from '@micropasts/record-completeness/core';
import { RecordCompleteness } from '@micropasts/record-completeness/shadow';
import { RecordCompletenessTailwind } from '@micropasts/record-completeness/tailwind';
```

### `evaluateCompleteness(record, schema)`

Evaluates a record and returns:

```js
const evaluation = evaluateCompleteness(record);

evaluation.score;
evaluation.earnedWeight;
evaluation.totalWeight;
evaluation.fields;
evaluation.missingRequired;
evaluation.missingRecommended;
evaluation.status;
```

Each entry in `fields` contains:

```js
{
  key: 'title',
  label: 'Title',
  weight: 15,
  required: true,
  present: true,
  preview: 'Roman silver denarius',
}
```

Arrays are represented as item counts, objects as `Structured value`, and long strings are shortened for display. `missingRequired` and `missingRecommended` contain the corresponding field entries.

### `parseRecordData(element)`

Returns the JSON record embedded in an element's `record` attribute or nested JSON script, or `null` when no valid record is available.

### `emitRecordSelect(target, record, evaluation)`

Dispatches `heritage:select` from `target`, with a record and optional evaluation attached to `event.detail`.

### `copyTextToClipboard(text)`

Asynchronously copies text using the modern Clipboard API where secure contexts allow it, with a temporary textarea fallback. It resolves to `true` when copying succeeds and `false` otherwise.

### Component methods

```js
checker.setRecord(record);
checker.setSchema(schema); // Shadow DOM component only
```

## Shadow DOM customization

The Shadow DOM component exposes CSS custom properties on `:host`:

```css
record-completeness {
  --rc-bg: #ffffff;
  --rc-fg: #18181b;
  --rc-muted: #52525b;
  --rc-border: #e4e4e7;
  --rc-surface: rgba(127, 127, 127, 0.07);
  --rc-accent: #0284c7;
  --rc-ok: #15803d;
  --rc-warn: #b45309;
  --rc-bad: #b91c1c;
  --rc-radius: 0.5rem;
  --rc-font: system-ui, sans-serif;
}
```

The default markup includes these exported Shadow DOM parts:

```css
record-completeness::part(card) {}
record-completeness::part(header) {}
record-completeness::part(title) {}
record-completeness::part(score) {}
record-completeness::part(bar) {}
record-completeness::part(fields) {}
```

For a completely custom rendering function:

```js
import { RecordCompleteness } from '@micropasts/record-completeness';

RecordCompleteness.setTemplate((evaluation, record, escapeHtml) => `
  <article>
    <h2>${escapeHtml(record.title || 'Untitled')}</h2>
    <p>${evaluation.score}% complete</p>
  </article>
`);
```

A template can also be assigned to one instance:

```js
document.querySelector('record-completeness').template =
  (evaluation, record, escapeHtml) =>
    `<strong>${escapeHtml(record.identifier)}: ${evaluation.score}%</strong>`;
```

Custom templates replace the built-in Shadow DOM markup. They should use the supplied `escapeHtml` function for untrusted record text and may bind actions to `evaluation` and `record`.

## Browser builds

| File | Use |
| --- | --- |
| `dist/record-completeness.esm.js` | Bundled ES module for browser or bundler use |
| `dist/record-completeness.iife.js` | Standalone browser script and `window.RecordCompletenessLib` |
| `dist/record-completeness.esm.js` | Main and module entry in `package.json` |
| `docs/record-completeness.esm.js` | Live demo bundle |
| `docs/index.html` | Live Tailwind and Shadow DOM demo |

The IIFE build exposes:

```js
window.RecordCompletenessLib.DEFAULT_METADATA_SCHEMA
window.RecordCompletenessLib.evaluateCompleteness
window.RecordCompletenessLib.parseRecordData
window.RecordCompletenessLib.emitRecordSelect
window.RecordCompletenessLib.copyTextToClipboard
window.RecordCompletenessLib.RecordCompleteness
window.RecordCompletenessLib.RecordCompletenessTailwind
```

## Development

```bash
npm install
npm run build
npm run dev
```

`npm run build` recreates `dist/` and `docs/`:

```text
scripts/build.js
├── dist/record-completeness.esm.js
├── dist/record-completeness.iife.js
├── docs/record-completeness.esm.js
└── docs/index.html
```

`npm run dev` builds the project and serves `docs/` with `npx serve`.

The GitHub Actions workflow at `.github/workflows/pages.yml` rebuilds the demo and deploys `docs/` to GitHub Pages on pushes to `main`.

## Browser support

The package uses Web Components, Shadow DOM, `CustomEvent`, `customElements`, `HTMLElement`, and modern JavaScript modules. It is suitable for current evergreen browsers. The package has no runtime dependencies.

For broad compatibility, serve the package on the same origin or from HTTPS and provide a current polyfill stack only if legacy browser support is required.

## License

MIT. See [LICENSE.md](./LICENSE.md).