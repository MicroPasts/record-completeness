import {
  DEFAULT_METADATA_SCHEMA,
  evaluateCompleteness,
  parseRecordData,
  emitRecordSelect,
  copyTextToClipboard,
} from './core.js';

let globalTemplate = null;

export class RecordCompleteness extends HTMLElement {
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