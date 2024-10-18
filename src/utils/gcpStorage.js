require('dotenv').config();
const fs = require('fs');

const console = require('./wsLog')(__filename, 'GCP');

// 環境
const ENVIRONMENT = process.env['ENVIRONMENT'];
// 下載物是否上傳至GCP STORAGE
const GCP_STORAGE_BUCKET_STARTS = (process.env.GCP_STORAGE_BUCKET_STARTS == 'true');

// Google Storage Doc: https://googleapis.dev/nodejs/storage/latest/Bucket.html
const gcpCredentialKey = process.env["GCP_STORAGE_CREDENTIAL_KEY_FILE_PATH"];
const gpcBucketName = process.env["GCP_STORAGE_BUCKET_NAME"];
const { Storage } = require('@google-cloud/storage');
const gcpStorage = new Storage({ keyFilename: gcpCredentialKey });
const gcpBucket = gcpStorage.bucket(gpcBucketName);

function uploadFile(srcFilePath, destFilePath, overwrite, removeAfterUpload, maxAge, callback) {
  if (!fs.existsSync(srcFilePath)) {
    console.debug('srcFilePath not exist', srcFilePath);
    return callback && callback();
  }
  // console.log('srcFilePath exist', srcFilePath);
  // console.log('destFilePath', destFilePath);

  if(!GCP_STORAGE_BUCKET_STARTS) {
    return callback && callback();
  }
  if(!overwrite) {
    gcpBucket.file(destFilePath).exists((err, exists) => {
      if(err) {
        console.error(err);
        callback && callback(err);
      } else {
        if(exists) {
          // console.log("File existed! Skip upload file: " + destFilePath);
          callback && callback();
        } else {
          uploadFile(srcFilePath, destFilePath, true, removeAfterUpload, maxAge, callback);
        }
      }
    })
  } else {
    const options = {
      destination: destFilePath,
      resumable: false,
      gzip: true,
    }
    if (maxAge) {
      // If the contents will change, use cacheControl: 'no-cache'
      // default maxAge = 'public, max-age=3600'
      options.metadata = { cacheControl: maxAge };
    }
    gcpBucket.upload(srcFilePath, options, ((err, file, apiResponse) => {
      if(err) {
        console.error(err);
      }
      // console.log(apiResponse);
      if (removeAfterUpload && !err) {
        fs.unlinkSync(srcFilePath);
      }
      callback && callback(err, apiResponse);
    }));
  }
}

function listFiles(filepath, callback) {
  gcpBucket.getFiles({
    autoPaginate: false,
    prefix: filepath,
  }, ((err, files) => {
    if (err) {
      callback && callback(err);
    } else {
      callback && callback(null, files.map(f => f.name));
    }
  }))
}

module.exports.uploadFile = uploadFile;
module.exports.listFiles = listFiles;