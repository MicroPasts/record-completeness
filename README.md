# @micropasts/record-completeness

Framework-free Web Components for auditing the completeness of cultural heritage and archaeological metadata records.

The package evaluates a record against a weighted schema, reports required and recommended fields that are missing, and emits structured selection events. It provides two renderers:

- `<record-completeness>`: isolated Shadow DOM with built-in styling
- `<record-completeness-tw>`: Light DOM markup intended for Tailwind CSS or page-level CSS

Both components support full cards, collapsible field lists, compact score-only mode, custom schemas, record updates, and external selection listeners.

## Features

- Zero runtime dependencies
- Weighted completeness scores
- Required and recommended field status
- Full and score-only display modes
- Collapsible field lists
- Shadow DOM and Light DOM implementations
- Custom metadata schemas
- Custom Shadow DOM templates
- Embedded JSON or JSON attribute data
- Clipboard summaries
- `heritage:select` events
- ESM and IIFE browser builds
- Live default-schema and 74-column PAS demos

## Installation

### npm

```bash
npm install @micropasts/record-completeness
```

```js
import '@micropasts/record-completeness';
```

The package registers both custom elements automatically, unless those tag names are already registered.

### CDN

Load the standalone IIFE build:

```html
<script src="https://cdn.jsdelivr.net/npm/@micropasts/record-completeness/dist/record-completeness.iife.js"></script>
```

Or load the ESM bundle directly:

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@micropasts/record-completeness/dist/record-completeness.esm.js';
</script>
```

The IIFE build registers the components and exposes `window.RecordCompletenessLib`.

## Quick start

### Full Shadow DOM card

```html
<record-completeness>
  <script type="application/json">
    {
      "identifier": "PAS-SUR-12A901",
      "title": "Roman silver denarius of Trajan",
      "type": "Coin",
      "date": "AD 98-117",
      "place": "Near Farnham, Surrey",
      "description": "Silver denarius depicting Trajan",
      "rights": "CC BY 4.0",
      "authorityUri": "https://nomisma.org/id/denarius"
    }
  </script>
</record-completeness>

<script type="module">
  import '@micropasts/record-completeness';
</script>
```

### Full Tailwind/Light DOM card

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
```

### Collapsed card

```html
<record-completeness-tw collapsed>
  <script type="application/json">
    {
      "identifier": "PAS-HAMP-88B210",
      "title": "Medieval copper-alloy strap-end",
      "type": "Strap-end",
      "rights": "CC BY 4.0"
    }
  </script>
</record-completeness-tw>
```

A collapsed card shows the title, score, status, points, and action buttons. It hides the field list until **Expand Fields** is selected.

### Compact score mode

```html
<record-completeness mode="score">
  <script type="application/json">
    {
      "title": "Roman silver denarius",
      "identifier": "PAS-SUR-12A901"
    }
  </script>
</record-completeness>

<record-completeness-tw mode="score">
  <script type="application/json">
    {
      "title": "Copper-alloy brooches",
      "identifier": "EXC-2026-044"
    }
  </script>
</record-completeness-tw>
```

Score mode renders an inline title-and-percentage badge. It is suitable for search results, tables, record headers, and list views.

## Supplying record data

The preferred source is a nested JSON script:

```html
<record-completeness>
  <script type="application/json">
    {
      "identifier": "MCR-2026-001",
      "title": "Tested record",
      "rights": "CC0"
    }
  </script>
</record-completeness>
```

JSON can also be supplied through the `record` attribute:

```html
<record-completeness
  record='{"identifier":"MCR-001","title":"Excavation register","rights":"CC BY 4.0"}'>
</record-completeness>
```

The attribute is checked first. If it is present but contains invalid JSON, the component does not fall back to a nested script. If neither source contains valid JSON, the record is treated as `{}`.

Update a component after initialization:

```js
const checker = document.querySelector('record-completeness');

checker.setRecord({
  identifier: 'MCR-002',
  title: 'Updated record',
  rights: 'CC BY 4.0',
  authorityUri: 'https://example.org/authorities/002',
});
```

Both components implement `setRecord(record)`. The same title fallback is used in both renderers:

1. `record.title`
2. `record.find_identifier`
3. `record.identifier`
4. `"Untitled Record"`

## Components

### `<record-completeness>`

The Shadow DOM component uses native encapsulated styles and exposes:

- Full card mode
- `mode="score"` compact pill mode
- `collapsed` field-list mode
- Theme attributes
- Shadow DOM CSS custom properties
- CSS Shadow Parts
- Custom templates

Register and import it with:

```js
import { RecordCompleteness } from '@micropasts/record-completeness';
```

### `<record-completeness-tw>`

The Light DOM component renders ordinary HTML that can be styled with Tailwind utilities or application CSS.

It supports `card-class` for extending the card element:

```html
<record-completeness-tw card-class="shadow-lg max-w-md">
  <!-- JSON data -->
</record-completeness-tw>
```

In score mode, `card-class` is applied to the score pill as well.

Import it directly with:

```js
import { RecordCompletenessTailwind } from '@micropasts/record-completeness/tailwind';
```

## Attributes

| Attribute | Components | Behavior |
| --- | --- | --- |
| `record` | Both | JSON-encoded record object |
| `mode="full"` | Both | Default full card and field list |
| `mode="score"` | Both | Compact title-and-score pill |
| `collapsed` | Both | Hides field rows by default |
| `listen="event-name"` | Both | Updates from an external window event |
| `theme="light"` | Shadow DOM | Forces light styling |
| `theme="dark"` | Shadow DOM | Forces dark styling |
| `card-class` | Tailwind | Adds classes to card or score pill markup |

`collapsed` can be changed at runtime:

```js
checker.setCollapsed(true);  // hides fields
checker.setCollapsed(false); // shows fields
```

Changing `collapsed` updates the corresponding attribute and re-renders the component.

## Completeness scoring

The default schema is:

| Key | Label | Weight | Required |
| --- | --- | ---: | :---: |
| `identifier` | Identifier | 15 | Yes |
| `title` | Title | 15 | Yes |
| `type` | Object / Record Type | 12 | Yes |
| `date` | Date / Period | 12 | Yes |
| `place` | Provenance / Findspot | 12 | No |
| `description` | Description | 10 | No |
| `rights` | Rights / Licence | 10 | Yes |
| `authorityUri` | Authority URI | 8 | No |
| `creator` | Creator / Recorder | 6 | No |

The score is:

```text
round(populated weight / total active schema weight * 100)
```

The status is:

- **Needs Attention**: at least one required field is missing, or score is below 50
- **Partial**: no required fields are missing, but score is below 85 or a recommended field is missing
- **Complete**: no required fields are missing, score is 85 or above, and no recommended fields are missing

A field is populated when it is:

- a non-empty string
- a finite number
- a boolean
- an array containing at least one populated item
- an object containing at least one populated value

The string `"NULL"` is treated as missing after case-insensitive whitespace trimming. Empty strings, whitespace, `null`, `undefined`, empty arrays, and objects with no populated values are also missing.

## Custom schemas

Both components support `setSchema(schema)`:

```js
const schema = [
  { key: 'id', label: 'Accession number', weight: 20, required: true },
  { key: 'title', label: 'Object title', weight: 20, required: true },
  { key: 'museum', label: 'Holding institution', weight: 15, required: true },
  { key: 'period', label: 'Period', weight: 10, required: false },
  { key: 'vocabUri', label: 'Controlled vocabulary URI', weight: 10, required: false },
];

document.querySelector('record-completeness').setSchema(schema);
document.querySelector('record-completeness-tw').setSchema(schema);
```

Each schema entry accepts:

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string` | Record property to inspect |
| `label` | `string` | Display label |
| `weight` | `number` | Points awarded when populated |
| `required` | `boolean` | Whether absence marks the record as incomplete |

An empty or invalid schema falls back to `DEFAULT_METADATA_SCHEMA`. The default weight is `10` when a weight is omitted, and the key is used as the label when `label` is omitted.

### PAS/antiquities 74-column demo

The demo site includes `docs/pas.html`, which audits a PAS-style antiquities record with 74 schema fields. It demonstrates a 74-column custom schema applied to `<record-completeness-tw>`.

The PAS example:

- uses `find_identifier` as a title fallback
- treats a literal `"NULL"` value as missing
- makes every field required except `updated_by` and `updated_at`
- gives `find_identifier`, `title`, and `description` extra weight
- covers identifiers, discovery, dating, dimensions, materials, workflow, treasure status, and database metadata

Open it through `pas.html` when using the demo site.

## Evaluation API

```js
import {
  DEFAULT_METADATA_SCHEMA,
  evaluateCompleteness,
  parseRecordData,
  emitRecordSelect,
  copyTextToClipboard,
} from '@micropasts/record-completeness';
```

Subpath imports are available:

```js
import { evaluateCompleteness } from '@micropasts/record-completeness/core';
import { RecordCompleteness } from '@micropasts/record-completeness/shadow';
import { RecordCompletenessTailwind } from '@micropasts/record-completeness/tailwind';
```

### `evaluateCompleteness(record, schema)`

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

Each field result includes:

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

Field previews use:

- `"Missing"` for absent values
- `${length} item(s)` for arrays
- `"Structured value"` for objects
- the original string for short values
- a shortened string with an ellipsis for values over 48 characters

### `parseRecordData(element)`

Returns a parsed record from the element's `record` attribute or nested `script[type="application/json"]`, or `null`.

### `copyTextToClipboard(text)`

Uses `navigator.clipboard.writeText()` in secure browser contexts, then falls back to a temporary textarea and `document.execCommand('copy')`.

Returns `true` for a successful copy and `false` for an empty value or failed copy.

### `emitRecordSelect(target, record, evaluation)`

Dispatches a bubbling, composed `heritage:select` event from `target`.

## Events

The built-in **Emit Select** button calls `emitRecordSelect()`. Listen for the event like this:

```js
document.addEventListener('heritage:select', (event) => {
  console.log(event.detail);
});
```

The event detail is:

```js
{
  uri: '',
  identifier: '',
  title: '',
  completenessScore: 83,
  record: { /* original record object */ }
}
```

Mapping rules:

- `uri`: `record.authorityUri`, then `record.uri`
- `identifier`: `record.find_identifier`, then `record.identifier`
- `title`: `record.title`
- `completenessScore`: the evaluation score, or `null`

### Listen to an external event

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

Components on `window` listen for the configured event name and adopt `event.detail.record`. Their listeners are removed when they disconnect.

## Component methods

Both component classes provide:

```js
checker.setRecord(record);
checker.setSchema(schema);
checker.setCollapsed(true);
```

The Tailwind component also uses `setSchema()`; custom schemas are not limited to the Shadow DOM renderer.

## Shadow DOM customization

The Shadow DOM component uses these CSS custom properties:

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

The full renderer exposes these Shadow Parts:

```css
record-completeness::part(card) {}
record-completeness::part(header) {}
record-completeness::part(title) {}
record-completeness::part(score) {}
record-completeness::part(bar) {}
record-completeness::part(fields) {}
```

The score-only renderer also exposes `part="score-only"`.

Set a custom template for every Shadow DOM instance:

```js
import { RecordCompleteness } from '@micropasts/record-completeness';

RecordCompleteness.setTemplate((evaluation, record, escapeHtml) => `
  <article>
    <h2>${escapeHtml(record.title || 'Untitled')}</h2>
    <p>${evaluation.score}% complete</p>
  </article>
`);
```

Set a template for one instance:

```js
document.querySelector('record-completeness').template =
  (evaluation, record, escapeHtml) =>
    `<strong>${escapeHtml(record.title || record.identifier)}: ${evaluation.score}%</strong>`;
```

Custom templates take precedence over the built-in full and score-only renderers. Escape untrusted record values with the supplied `escapeHtml()` function.

## Browser builds

| File | Purpose |
| --- | --- |
| `dist/record-completeness.esm.js` | Bundled ES module |
| `dist/record-completeness.iife.js` | Standalone browser script |
| `docs/record-completeness.esm.js` | Demo bundle |
| `docs/index.html` | Default-schema demo |
| `docs/pas.html` | 74-column PAS/antiquities schema demo |

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
dist/
├── record-completeness.esm.js
└── record-completeness.iife.js

docs/
├── index.html
├── pas.html
└── record-completeness.esm.js
```

`npm run dev` builds the project and serves `docs/` with `npx serve`.

The GitHub Actions workflow rebuilds the demos and deploys `docs/` to GitHub Pages after pushes to `main`.

## Browser support

The package is suitable for current evergreen browsers and uses native custom elements, Shadow DOM, `CustomEvent`, and JavaScript modules. It has no runtime dependencies.

Applications requiring older browsers may need a Web Components polyfill stack.

## License

MIT. See [LICENSE.md](./LICENSE.md).
