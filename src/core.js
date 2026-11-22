export const DEFAULT_METADATA_SCHEMA = [
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
export function evaluateCompleteness(record = {}, schema = DEFAULT_METADATA_SCHEMA) {
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

export function parseRecordData(el) {
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

export function emitRecordSelect(target, record, evaluation) {
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

export async function copyTextToClipboard(text) {
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