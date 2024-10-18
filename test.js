const GcsUploader = require('./src/utils/gcsUploader.js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testGcsUploader() {
    const projectId = process.env.GCP_PROJECT_ID;
    const keyFilename = process.env.GCP_KEY_FILENAME;
    const bucketName = process.env.GCP_BUCKET_NAME;

    console.log(projectId, keyFilename, bucketName);
    const gcsUploader = new GcsUploader(projectId, keyFilename);
    
    const filePath = './uploads/testImage.png';
    const fileName = path.basename(filePath);

    // 上傳文件
    const gcsFilePath = await  gcsUploader.uploadFile(bucketName, filePath, `destination/${fileName}`);
    console.log(gcsFilePath);
    
    // // 下載文件
    // const downloadDir = path.join(__dirname, '.', 'uploads');
    // const downloadPath = path.join(downloadDir, 'testImage111.png');
    
    // // 確保下載目錄存在
    // if (!fs.existsSync(downloadDir)) {
    //     fs.mkdirSync(downloadDir, { recursive: true });
    // }
    
    // await gcsUploader.downloadFile(bucketName, 'destination/testImage.png', downloadPath);
    
    
    // 列出文件
    // gcsUploader.listFiles(bucketName);
    
    // // 删除文件
    // gcsUploader.deleteFile(bucketName, 'destination/testImage.png');
}

// 執行測試
testGcsUploader();