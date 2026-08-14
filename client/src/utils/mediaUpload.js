import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombvnpeoietugpxelugs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYnZucGVvaWV0dWdweGVsdWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODM2ODYsImV4cCI6MjA2NzU1OTY4Nn0.mv9NsqrC2tckMmHa2w0X8Vg0fGtjsQXYYbMG1LRy9K4';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default function MediaUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No file selected');
      return;
    }
    const timeStamp = new Date().getTime();
    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '') : 'image.jpg';
    const filePath = `nclean/${timeStamp}-${cleanFileName}`;

    supabase.storage
      .from('cropcartimages')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error uploading image to Supabase:', error);
          reject(error.message || 'Error uploading image');
          return;
        }
        const { data } = supabase.storage.from('cropcartimages').getPublicUrl(filePath);
        resolve(data.publicUrl);
      })
      .catch((error) => {
        console.error('Error uploading image:', error);
        reject('Error uploading image');
      });
  });
}
