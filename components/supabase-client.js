import { createClient } from '@supabase/supabase-js';

export const SUPA_URL = 'https://waapqyshmqaaamiiitso.supabase.co';
export const SUPA_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE';

export const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { flowType: 'pkce' } });

// ─── REST helper ──────────────────────────────────────────────────────────────
// Thin wrapper over PostgREST that forwards the signed-in user's JWT so RLS applies.
// Mirrors the copy in KeeplyApp.jsx so self-contained components (DocumentAttachments,
// PhotoGallery) can talk to the DB without prop-drilling or importing the monolith.
export async function supa(table, opts) {
  const { method = 'GET', query = '', body, prefer } = opts || {};
  let token = SUPA_KEY;
  try {
    if (typeof localStorage !== 'undefined') {
      const lsKey = Object.keys(localStorage).find(function (k) {
        return k.includes('auth-token');
      });
      if (lsKey) {
        const lsData = JSON.parse(localStorage.getItem(lsKey));
        const t = lsData?.access_token || lsData?.data?.session?.access_token;
        if (t) token = t;
      }
    }
  } catch (e) {
    /* fall back to anon */
  }
  if (token === SUPA_KEY) {
    try {
      const sess = await supabase.auth.getSession();
      if (sess.data.session && sess.data.session.access_token) {
        token = sess.data.session.access_token;
      }
    } catch (e) {
      /* fall back to anon */
    }
  }
  const headers = {
    apikey: SUPA_KEY,
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    Prefer: prefer || 'return=representation',
  };
  const res = await fetch(SUPA_URL + '/rest/v1/' + table + (query ? '?' + query : ''), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(function () {
      return {};
    });
    throw new Error((err.message || err.code || res.status) + ' on ' + table);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Storage upload ───────────────────────────────────────────────────────────
// Uploads a file to the `equipment-docs` public bucket under `${pathPrefix}/${ts}-${name}`.
// Returns the public URL. The bucket is shared by documents + photos — path prefix keeps
// them separable.
export async function uploadToStorage(file, pathPrefix) {
  const safeFileName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = pathPrefix + '/' + Date.now() + '-' + safeFileName;
  let token = SUPA_KEY;
  try {
    const sess = await supabase.auth.getSession();
    if (sess.data.session && sess.data.session.access_token) {
      token = sess.data.session.access_token;
    }
  } catch (e) {
    /* fall back to anon */
  }
  const res = await fetch(SUPA_URL + '/storage/v1/object/equipment-docs/' + path, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.json().catch(function () {
      return {};
    });
    throw new Error(
      'File upload failed: ' +
        (err.message || err.error || res.status) +
        '. Check storage bucket RLS policies.'
    );
  }
  return SUPA_URL + '/storage/v1/object/public/equipment-docs/' + path;
}

// ─── Image compression ────────────────────────────────────────────────────────
// Resizes to maxWidth, re-encodes as JPEG at `quality`. Falls back to the original
// file on any canvas/decoder error (HEIC, huge PNGs, iOS quirks).
export async function compressImage(file, maxWidth, quality) {
  return new Promise(function (resolve) {
    const reader = new FileReader();
    reader.onerror = function () {
      resolve(file);
    };
    reader.onload = function (ev) {
      const img = new Image();
      img.onerror = function () {
        resolve(file);
      };
      img.onload = function () {
        try {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            function (blob) {
              if (!blob) {
                resolve(file);
                return;
              }
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
              );
            },
            'image/jpeg',
            quality || 0.78
          );
        } catch (e) {
          resolve(file);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
