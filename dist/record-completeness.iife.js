/**
 * @micropasts/record-completeness v0.1.0
 * Zero-dependency cultural heritage metadata completeness Web Components
 * License: MIT
 */
(function () {
'use strict';
const DEFAULT_METADATA_SCHEMA = [
  { key: 'identifier', label: 'Identifier', weight: 15, required: true },
  { key: 'title', label: 'Title', weight: 15, required: true },
  { key: 'type', label: 'Object / Record Type', weight: 12, required: true },
  { key: 'date', label: 'Date / Period', weight: 12, required: true },
  { key: 'place', label: 'Provenance / Findspot', weight: 12, required: false },
  { key: 'description', label: 'Description', weight: 10, required: false },
  { key: 'rights', label: 'Rights / Licence', weight: 10, required: true },
  { key: 'authorityUri', label: 'Authority URI', weight: 8, required: false },
  { key: 'creator', label: 'Creator / Recorder', weight: 6, required: false },
];

function isPopulated(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => isPopulated(item));
  if (typeof value === 'object') {
    return Object.values(value).some((v) => isPopulated(v));
  }
  return false;
}

function summarizeValue(value) {
  if (!isPopulated(value)) return 'Missing';
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') return 'Structured value';
  const str = String(value).trim();
  return str.length > 48 ? `${str.slice(0, 47)}…` : str;
}

/**
 * Evaluate a record object against a metadata schema.
 * Returns { score, totalWeight, earnedWeight, fields, missingRequired, missingRecommended, status }.
 */
function evaluateCompleteness(record = {}, schema = DEFAULT_METADATA_SCHEMA) {
  const rec = record && typeof record === 'object' ? record : {};
  const activeSchema = Array.isArray(schema) && schema.length ? schema : DEFAULT_METADATA_SCHEMA;

  let totalWeight = 0;
  let earnedWeight = 0;

  const fields = activeSchema.map((field) => {
    const weight = Number(field.weight ?? 10);
    const present = isPopulated(rec[field.key]);
    totalWeight += weight;
    if (present) earnedWeight += weight;

    return {
      key: field.key,
      label: field.label || field.key,
      weight,
      required: Boolean(field.required),
      present,
      preview: summarizeValue(rec[field.key]),
    };
  });

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const missingRequired = fields.filter((f) => f.required && !f.present);
  const missingRecommended = fields.filter((f) => !f.required && !f.present);

  let status = 'Complete';
  if (missingRequired.length > 0 || score < 50) {
    status = 'Needs Attention';
  } else if (score < 85 || missingRecommended.length > 0) {
    status = 'Partial';
  }

  return {
    score,
    earnedWeight,
    totalWeight,
    fields,
    missingRequired,
    missingRecommended,
    status,
  };
}

function parseRecordData(el) {
  const attr = el.getAttribute('record');
  if (attr) {
    try {
      return JSON.parse(attr);
    } catch {
      return null;
    }
  }
  const scriptEl = el.querySelector('script[type="application/json"]');
  if (scriptEl) {
    try {
      return JSON.parse(scriptEl.textContent);
    } catch {
      return null;
    }
  }
  return null;
}

function emitRecordSelect(target, record, evaluation) {
  target.dispatchEvent(
    new CustomEvent('heritage:select', {
      bubbles: true,
      composed: true,
      detail: {
        uri: record?.authorityUri || record?.uri || '',
        identifier: record?.identifier || '',
        title: record?.title || '',
        completenessScore: evaluation?.score ?? null,
        record,
      },
    })
  );
}

async function copyTextToClipboard(text) {
  const value = String(text ?? '').trim();
  if (!value) return false;

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    typeof window !== 'undefined' &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

let globalTemplate = null;

class RecordCompleteness extends HTMLElement {
  static get observedAttributes() {
    return ['mode', 'listen'];
  }

  static setTemplate(fn) {
    globalTemplate = fn;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._record = null;
    this._schema = DEFAULT_METADATA_SCHEMA;
    this._showAll = true;
    this.template = null;
    this._onExternalSelect = this._onExternalSelect.bind(this);
  }

  connectedCallback() {
    this._record = parseRecordData(this) || {};
    this.render();
    this._bindEvents();

    const listenEvent = this.getAttribute('listen');
    if (listenEvent) {
      window.addEventListener(listenEvent, this._onExternalSelect);
    }
  }

  disconnectedCallback() {
    const listenEvent = this.getAttribute('listen');
    if (listenEvent) {
      window.removeEventListener(listenEvent, this._onExternalSelect);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this.isConnected) return;
    if (name === 'mode') {
      this.render();
      this._bindEvents();
    }
  }

  setRecord(record) {
    this._record = record || {};
    this.render();
    this._bindEvents();
  }

  setSchema(schema) {
    this._schema = Array.isArray(schema) && schema.length ? schema : DEFAULT_METADATA_SCHEMA;
    this.render();
    this._bindEvents();
  }

  _onExternalSelect(e) {
    if (e.detail?.record && typeof e.detail.record === 'object') {
      this._record = e.detail.record;
      this.render();
      this._bindEvents();
    }
  }

  _bindEvents() {
    const toggleBtn = this.shadowRoot.querySelector('.toggle-missing');
    toggleBtn?.addEventListener('click', () => {
      this._showAll = !this._showAll;
      this.render();
      this._bindEvents();
    });

    const copyBtn = this.shadowRoot.querySelector('.copy-report');
    copyBtn?.addEventListener('click', async (e) => {
      const payload = e.currentTarget.getAttribute('data-report') || '';
      const ok = await copyTextToClipboard(payload);
      if (ok) {
        copyBtn.textContent = 'Copied';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Summary';
        }, 1200);
      }
    });

    const inspectBtn = this.shadowRoot.querySelector('.inspect-btn');
    inspectBtn?.addEventListener('click', () => {
      const ev = evaluateCompleteness(this._record, this._schema);
      emitRecordSelect(this, this._record, ev);
    });
  }

  _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const ev = evaluateCompleteness(this._record, this._schema);
    const visibleFields = this._showAll
      ? ev.fields
      : ev.fields.filter((f) => !f.present);

    const customFn = this.template || globalTemplate;
    if (typeof customFn === 'function') {
      this.shadowRoot.innerHTML = customFn(ev, this._record, this._esc.bind(this));
      return;
    }

    const title = this._record?.title || this._record?.identifier || 'Untitled Record';
    const summaryText = `${title}: ${ev.score}% complete (${ev.status}). Missing required: ${
      ev.missingRequired.map((f) => f.label).join(', ') || 'none'
    }.`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
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
          --rc-font: system-ui, -apple-system, sans-serif;

          display: block;
          font-family: var(--rc-font);
          color: var(--rc-fg);
        }

        @media (prefers-color-scheme: dark) {
          :host(:not([theme="light"])) {
            --rc-bg: #18181b;
            --rc-fg: #f4f4f5;
            --rc-muted: #a1a1aa;
            --rc-border: #3f3f46;
            --rc-ok: #4ade80;
            --rc-warn: #fbbf24;
            --rc-bad: #f87171;
          }
        }

        :host([theme="dark"]) {
          --rc-bg: #18181b;
          --rc-fg: #f4f4f5;
          --rc-muted: #a1a1aa;
          --rc-border: #3f3f46;
          --rc-ok: #4ade80;
          --rc-warn: #fbbf24;
          --rc-bad: #f87171;
        }

        .card {
          background: var(--rc-bg);
          color: var(--rc-fg);
          border: 1px solid var(--rc-border);
          border-radius: var(--rc-radius);
          padding: 14px;
        }

        .top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .title { font-weight: 700; font-size: 14px; }
        .score { font-family: ui-monospace, monospace; font-weight: 700; font-size: 14px; color: var(--rc-accent); }
        .bar-track { height: 8px; border-radius: 9999px; background: var(--rc-surface); overflow: hidden; margin: 8px 0; }
        .bar-fill { height: 100%; background: var(--rc-accent); transition: width 0.2s ease; }
        .meta-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--rc-muted); margin-bottom: 10px; }
        .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        button {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--rc-border);
          background: var(--rc-surface);
          color: var(--rc-fg);
          cursor: pointer;
        }
        .list { display: grid; gap: 5px; }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 5px 8px;
          border-radius: 4px;
          background: var(--rc-surface);
          font-size: 12px;
        }
        .req { font-size: 10px; text-transform: uppercase; opacity: 0.7; margin-left: 4px; }
        .ok { color: var(--rc-ok); font-weight: 600; }
        .missing-req { color: var(--rc-bad); font-weight: 600; }
        .missing-opt { color: var(--rc-warn); font-weight: 600; }
      </style>
      <div part="card" class="card">
        <div part="header" class="top">
          <div part="title" class="title">${this._esc(title)}</div>
          <div part="score" class="score">${ev.score}%</div>
        </div>
        <div part="bar" class="bar-track">
          <div class="bar-fill" style="width:${ev.score}%"></div>
        </div>
        <div class="meta-row">
          <span>Status: <strong>${this._esc(ev.status)}</strong></span>
          <span>${ev.earnedWeight}/${ev.totalWeight} pts · ${ev.missingRequired.length} required missing</span>
        </div>
        <div class="actions">
          <button type="button" class="toggle-missing">${this._showAll ? 'Show Missing Only' : 'Show All Fields'}</button>
          <button type="button" class="copy-report" data-report="${this._esc(summaryText)}">Copy Summary</button>
          <button type="button" class="inspect-btn">Emit Select</button>
        </div>
        <div part="fields" class="list">
          ${
            visibleFields.length
              ? visibleFields
                  .map((f) => {
                    const statusClass = f.present
                      ? 'ok'
                      : f.required
                        ? 'missing-req'
                        : 'missing-opt';
                    const statusText = f.present ? f.preview : 'Missing';
                    return `
                      <div class="row">
                        <span><strong>${this._esc(f.label)}</strong>${f.required ? '<span class="req">required</span>' : ''}</span>
                        <span class="${statusClass}">${this._esc(statusText)}</span>
                      </div>
                    `;
                  })
                  .join('')
              : `<div class="row"><span>All schema fields are populated.</span><span class="ok">100%</span></div>`
          }
        </div>
      </div>
    `;
  }
}

if (!customElements.get('record-completeness')) {
  customElements.define('record-completeness', RecordCompleteness);
}

class RecordCompletenessTailwind extends HTMLElement {
  static classes = {
    card:
      'rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-zinc-900 dark:text-zinc-100',
    btn:
      'rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-1 text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
  };

  constructor() {
    super();
    this._record = null;
    this._schema = DEFAULT_METADATA_SCHEMA;
    this._showAll = true;
    this._initialized = false;
    this._onExternalSelect = this._onExternalSelect.bind(this);
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    this._record = parseRecordData(this) || {};
    this.render();

    const listenEvent = this.getAttribute('listen');
    if (listenEvent) {
      window.addEventListener(listenEvent, this._onExternalSelect);
    }
  }

  disconnectedCallback() {
    const listenEvent = this.getAttribute('listen');
    if (listenEvent) {
      window.removeEventListener(listenEvent, this._onExternalSelect);
    }
  }

  setRecord(record) {
    this._record = record || {};
    this.render();
  }

  _onExternalSelect(e) {
    if (e.detail?.record && typeof e.detail.record === 'object') {
      this._record = e.detail.record;
      this.render();
    }
  }

  _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const c = RecordCompletenessTailwind.classes;
    const ev = evaluateCompleteness(this._record, this._schema);
    const visibleFields = this._showAll
      ? ev.fields
      : ev.fields.filter((f) => !f.present);

    const title = this._record?.title || this._record?.identifier || 'Untitled Record';
    const summaryText = `${title}: ${ev.score}% complete (${ev.status}). Missing required: ${
      ev.missingRequired.map((f) => f.label).join(', ') || 'none'
    }.`;
    const cardClass = `${c.card} ${this.getAttribute('card-class') || ''}`.trim();

    this.innerHTML = `
      <div class="${cardClass}">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">${this._esc(title)}</h3>
          <span class="font-mono text-sm font-bold text-sky-700 dark:text-sky-400">${ev.score}%</span>
        </div>

        <div class="mt-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div class="h-full bg-sky-600 dark:bg-sky-500 transition-all" style="width:${ev.score}%"></div>
        </div>

        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>Status: <strong class="text-zinc-900 dark:text-zinc-100">${this._esc(ev.status)}</strong></span>
          <span>${ev.earnedWeight}/${ev.totalWeight} pts · ${ev.missingRequired.length} required missing</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-rc-toggle class="${c.btn}">${this._showAll ? 'Show Missing Only' : 'Show All Fields'}</button>
          <button type="button" data-rc-copy data-report="${this._esc(summaryText)}" class="${c.btn}">Copy Summary</button>
          <button type="button" data-rc-select class="${c.btn}">Emit Select</button>
        </div>

        <div class="mt-3 space-y-1.5">
          ${
            visibleFields.length
              ? visibleFields
                  .map((f) => {
                    const badgeClass = f.present
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                      : f.required
                        ? 'text-red-700 dark:text-red-400 font-semibold'
                        : 'text-amber-700 dark:text-amber-400 font-medium';
                    return `
                      <div class="flex items-center justify-between gap-2 rounded-md bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800 px-2.5 py-1.5 text-xs">
                        <span class="text-zinc-800 dark:text-zinc-200">
                          <strong>${this._esc(f.label)}</strong>
                          ${f.required ? '<span class="ml-1 text-[10px] uppercase text-zinc-500">required</span>' : ''}
                        </span>
                        <span class="${badgeClass}">${f.present ? this._esc(f.preview) : 'Missing'}</span>
                      </div>
                    `;
                  })
                  .join('')
              : `<div class="rounded-md bg-zinc-50 dark:bg-zinc-950/70 px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-400">All fields complete (100%).</div>`
          }
        </div>
      </div>
    `;

    this.querySelector('[data-rc-toggle]')?.addEventListener('click', () => {
      this._showAll = !this._showAll;
      this.render();
    });

    this.querySelector('[data-rc-copy]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const ok = await copyTextToClipboard(btn.getAttribute('data-report') || '');
      if (ok) {
        btn.textContent = 'Copied';
        setTimeout(() => {
          btn.textContent = 'Copy Summary';
        }, 1200);
      }
    });

    this.querySelector('[data-rc-select]')?.addEventListener('click', () => {
      emitRecordSelect(this, this._record, ev);
    });
  }
}

if (!customElements.get('record-completeness-tw')) {
  customElements.define('record-completeness-tw', RecordCompletenessTailwind);
}

window.RecordCompletenessLib = {
    DEFAULT_METADATA_SCHEMA,
    evaluateCompleteness,
    parseRecordData,
    emitRecordSelect,
    copyTextToClipboard,
    RecordCompleteness,
    RecordCompletenessTailwind
  };
})();
