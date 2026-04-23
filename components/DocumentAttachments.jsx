'use client';
import { useEffect, useState } from 'react';
import { supa, uploadToStorage } from './supabase-client';

// Doc type palette — mirrors the equipment Docs tab styling from KeeplyApp.jsx.
const DOC_TYPES = [
  { id: 'Manual', icon: '📘', bg: '#dbeafe', color: '#1e40af' },
  { id: 'Warranty', icon: '🛡️', bg: '#e0e7ff', color: '#3730a3' },
  { id: 'Receipt', icon: '🧾', bg: '#d1fae5', color: '#065f46' },
  { id: 'Registration', icon: '📋', bg: '#fef3c7', color: '#92400e' },
  { id: 'Insurance', icon: '🛟', bg: '#fee2e2', color: '#991b1b' },
  { id: 'Other', icon: '📄', bg: '#e5e7eb', color: '#374151' },
];

function getDocType(id) {
  return DOC_TYPES.find((d) => d.id === id) || DOC_TYPES[DOC_TYPES.length - 1];
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocumentAttachments({ parentType, parentId, vesselId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Add-form state
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('file'); // 'file' | 'url'
  const [label, setLabel] = useState('');
  const [docType, setDocType] = useState('Other');
  const [fileObj, setFileObj] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Per-row edit state
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  // Load documents for this parent.
  useEffect(() => {
    let cancelled = false;
    if (!parentId || !vesselId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    supa('documents', {
      query:
        'parent_type=eq.' +
        parentType +
        '&parent_id=eq.' +
        parentId +
        '&order=created_at.desc',
    })
      .then((rows) => {
        if (cancelled) return;
        setDocs(rows || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Could not load documents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentType, parentId, vesselId]);

  function resetForm() {
    setShowForm(false);
    setMode('file');
    setLabel('');
    setDocType('Other');
    setFileObj(null);
    setExternalUrl('');
    setFormError(null);
  }

  async function handleAdd() {
    setFormError(null);
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setFormError('Give it a label first (e.g. "Owner manual").');
      return;
    }
    if (mode === 'file' && !fileObj) {
      setFormError('Pick a file or switch to URL mode.');
      return;
    }
    if (mode === 'url' && !externalUrl.trim()) {
      setFormError('Paste a link or switch to file mode.');
      return;
    }
    setSaving(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let mimeType = null;
      let fileSize = null;
      let externalLink = null;

      if (mode === 'file') {
        fileUrl = await uploadToStorage(fileObj, parentId);
        fileName = fileObj.name;
        mimeType = fileObj.type || null;
        fileSize = fileObj.size || null;
      } else {
        externalLink = externalUrl.trim();
      }

      const payload = {
        vessel_id: vesselId,
        parent_type: parentType,
        parent_id: parentId,
        label: trimmedLabel,
        doc_type: docType,
        file_url: fileUrl,
        file_name: fileName,
        external_url: externalLink,
        mime_type: mimeType,
        file_size_bytes: fileSize,
      };
      const created = await supa('documents', { method: 'POST', body: payload });
      const row = created && created[0];
      if (row) {
        setDocs((prev) => [row, ...prev]);
      }
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Could not save document.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(docId) {
    const prev = docs;
    setDocs((curr) => curr.filter((d) => d.id !== docId));
    try {
      await supa('documents', {
        method: 'DELETE',
        query: 'id=eq.' + docId,
        prefer: 'return=minimal',
      });
    } catch (err) {
      setDocs(prev); // revert
      setLoadError(err.message || 'Could not remove.');
    }
  }

  async function handleSaveLabel(docId) {
    const newLabel = editLabel.trim();
    if (!newLabel) {
      setEditingId(null);
      return;
    }
    const prev = docs;
    setDocs((curr) => curr.map((d) => (d.id === docId ? { ...d, label: newLabel } : d)));
    setEditingId(null);
    try {
      await supa('documents', {
        method: 'PATCH',
        query: 'id=eq.' + docId,
        body: { label: newLabel },
        prefer: 'return=minimal',
      });
    } catch (err) {
      setDocs(prev); // revert
      setLoadError(err.message || 'Could not rename.');
    }
  }

  if (loading) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>
        Loading documents…
      </div>
    );
  }

  return (
    <div>
      {loadError && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--danger-text)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-text)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
          }}
        >
          {loadError}
        </div>
      )}

      {docs.length === 0 && !showForm && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            padding: '16px 12px',
            textAlign: 'center',
          }}
        >
          No documents yet.
        </div>
      )}

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {docs.map((doc) => {
            const dt = getDocType(doc.doc_type);
            const href = doc.file_url || doc.external_url || '#';
            const isEditing = editingId === doc.id;
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    background: dt.bg,
                    color: dt.color,
                    borderRadius: 5,
                    padding: '2px 7px',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {dt.icon} {dt.id}
                </span>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => handleSaveLabel(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveLabel(doc.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      flex: 1,
                      border: '1px solid var(--brand)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 13,
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary, inherit)',
                    }}
                  />
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: 'var(--brand)',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={doc.label + (doc.file_name ? ' — ' + doc.file_name : '')}
                  >
                    {doc.label} ↗
                  </a>
                )}

                {!isEditing && doc.file_size_bytes && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatSize(doc.file_size_bytes)}
                  </span>
                )}

                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditLabel(doc.label || '');
                      setEditingId(doc.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontSize: 14,
                      color: 'var(--text-muted)',
                    }}
                    title="Rename"
                  >
                    ✎
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Remove "' + (doc.label || 'this document') + '"?')) {
                      handleRemove(doc.id);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: 14,
                    color: 'var(--danger-text)',
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1.5px dashed var(--border)',
            borderRadius: 8,
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Add document
        </button>
      ) : (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 12,
            background: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => setMode('file')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: mode === 'file' ? 'var(--brand)' : 'var(--bg-card)',
                color: mode === 'file' ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Upload file
            </button>
            <button
              onClick={() => setMode('url')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: mode === 'url' ? 'var(--brand)' : 'var(--bg-card)',
                color: mode === 'url' ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              External URL
            </button>
          </div>

          <input
            placeholder="Label (e.g. Owner manual)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              background: 'var(--bg-card)',
              color: 'var(--text-primary, inherit)',
              marginBottom: 8,
              boxSizing: 'border-box',
            }}
          />

          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              background: 'var(--bg-card)',
              color: 'var(--text-primary, inherit)',
              marginBottom: 8,
              boxSizing: 'border-box',
            }}
          >
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.id}
              </option>
            ))}
          </select>

          {mode === 'file' ? (
            <label
              style={{
                display: 'block',
                padding: '10px 12px',
                border: '1.5px dashed var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
                background: 'var(--bg-card)',
                marginBottom: 8,
              }}
            >
              {fileObj ? fileObj.name : 'Pick a file (PDF, JPG, PNG…)'}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) setFileObj(f);
                }}
              />
            </label>
          ) : (
            <input
              type="url"
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                background: 'var(--bg-card)',
                color: 'var(--text-primary, inherit)',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
          )}

          {formError && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--danger-text)',
                background: 'var(--danger-bg)',
                borderRadius: 6,
                padding: '6px 10px',
                marginBottom: 8,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
