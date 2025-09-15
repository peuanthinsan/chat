import { Storage } from '@google-cloud/storage';

const storage = new Storage();

const getBucket = () => {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName || bucketName === 'GCS_BUCKET') {
    throw new Error('GCS_BUCKET environment variable is not set');
  }
  return storage.bucket(bucketName);
};

export const uploadFile = async (file, destination) => {
  const bucket = getBucket();
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
