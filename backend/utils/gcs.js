import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET);

export const uploadFile = async (file, destination) => {
  const blob = bucket.file(destination);
  const stream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    })
    .on('error', reject)
    .end(file.buffer);
  });
};
