const { Storage } = require('@google-cloud/storage');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// 初始化 Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GCP_KEY_FILENAME,
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.GCP_BUCKET_NAME;

async function uploadMedia(file) {
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(file.originalname);
  const blobStream = blob.createWriteStream();

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
}

module.exports = { uploadMedia };