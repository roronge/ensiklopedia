import { supabase } from './supabase';

const BUCKET = 'kenangan-media';

export async function uploadMedia(file, familyId, memoryId) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
  const storage_path = `${familyId}/${memoryId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storage_path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream'
  });
  if (error) throw error;
  return {
    storage_path,
    public_url: '',
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size
  };
}

export async function removeMedia(paths=[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
