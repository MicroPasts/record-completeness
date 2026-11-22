import {
  DEFAULT_METADATA_SCHEMA,
  evaluateCompleteness,
  parseRecordData,
  emitRecordSelect,
  copyTextToClipboard,
} from './core.js';

export class RecordCompletenessTailwind extends HTMLElement {
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