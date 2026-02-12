import { put, list } from '@vercel/blob';

// Vite requires 'import.meta.env' to read your GitHub Secret
const BLOB_TOKEN = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;

export const syncToCloud = async (data: any) => {
  try {
    const response = await put('bhadrakali_db.json', JSON.stringify(data), {
      access: 'public',
      token: BLOB_TOKEN,
      addRandomSuffix: false, // This ensures the filename stays the same
    });
    console.log('✅ Synced to Vercel:', response.url);
    return response;
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
};

export const loadFromCloud = async () => {
  try {
    const { blobs } = await list({ token: BLOB_TOKEN });
    const dbBlob = blobs.find(b => b.pathname === 'bhadrakali_db.json');
    
    if (dbBlob) {
      const response = await fetch(dbBlob.url);
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('❌ Loading failed:', error);
    return null;
  }
};
