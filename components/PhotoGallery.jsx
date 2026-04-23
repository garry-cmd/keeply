'use client';
import { useEffect, useState } from 'react';
import { supa, uploadToStorage, compressImage } from './supabase-client';

export default function PhotoGallery({ parentType, parentId, vesselId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!parentId || !vesselId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    supa('photos', {
      query:
        'parent_type=eq.' +
        parentType +
        '&parent_id=eq.' +
        parentId +
        '&order=created_at.desc',
    })
      .then((rows) => {
        if (cancelled) return;
        setPhotos(rows || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Could not load photos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentType, parentId, vesselId]);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        let toUpload = file;
        if (/^image\//.test(file.type || '')) {
          try {
            toUpload = await compressImage(file, 1600, 0.78);
          } catch (e) {
            toUpload = file; // upload original on compression failure
          }
        }
        const fileUrl = await uploadToStorage(toUpload, parentId);
        const payload = {
          vessel_id: vesselId,
          parent_type: parentType,
          parent_id: parentId,
          file_url: fileUrl,
          file_name: toUpload.name || file.name,
          mime_type: toUpload.type || file.type || null,
          file_size_bytes: toUpload.size || null,
        };
        const created = await supa('photos', { method: 'POST', body: payload });
        const row = created && created[0];
        if (row) {
          setPhotos((prev) => [row, ...prev]);
        }
      }
    } catch (err) {
      setUploadError(err.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(photoId) {
    const prev = photos;
    setPhotos((curr) => curr.filter((p) => p.id !== photoId));
    setLightboxPhoto(null);
    try {
      await supa('photos', {
        method: 'DELETE',
        query: 'id=eq.' + photoId,
        prefer: 'return=minimal',
      });
    } catch (err) {
      setPhotos(prev); // revert
      setUploadError(err.message || 'Could not remove.');
    }
  }

  if (loading) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>
        Loading photos…
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

      {photos.length === 0 && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            padding: '16px 12px',
            textAlign: 'center',
          }}
        >
          No photos yet.
        </div>
      )}

      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightboxPhoto(p)}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                padding: 0,
                cursor: 'pointer',
                background: 'var(--bg-subtle)',
              }}
              title={p.file_name || 'Photo'}
            >
              <img
                src={p.file_url}
                alt={p.file_name || 'Photo'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}

      <label
        style={{
          display: 'block',
          padding: '10px 12px',
          border: '1.5px dashed var(--border)',
          borderRadius: 8,
          cursor: uploading ? 'default' : 'pointer',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          background: 'var(--bg-card)',
          fontWeight: 600,
        }}
      >
        {uploading ? 'Uploading…' : '+ Add photo'}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {uploadError && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--danger-text)',
            background: 'var(--danger-bg)',
            borderRadius: 6,
            padding: '6px 10px',
            marginTop: 8,
          }}
        >
          {uploadError}
        </div>
      )}

      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <img
            src={lightboxPhoto.file_url}
            alt={lightboxPhoto.file_name || 'Photo'}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 16,
            }}
          >
            <button
              onClick={() => {
                if (confirm('Remove this photo?')) handleRemove(lightboxPhoto.id);
              }}
              style={{
                padding: '8px 16px',
                background: 'var(--danger-text)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
            <button
              onClick={() => setLightboxPhoto(null)}
              style={{
                padding: '8px 16px',
                background: '#fff',
                color: '#111',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
