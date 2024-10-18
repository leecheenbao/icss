const { Storage }= require('@google-cloud/storage');
const path = require('path');

class GcsUploader {
  constructor(projectId, keyFilename) {
    this.storage = new Storage({ projectId, keyFilename });
  }

  async uploadFile(bucketName, filePath, destination) {
    try {
         // 確保目標文件名包含正確的副檔名
      const destinationWithExt = path.extname(destination) ? destination : `${destination}${ext}`;
      await this.storage.bucket(bucketName).upload(filePath, {
        destination: destination,
        // public: true,  // 設置文件為公開訪問
      });
      console.log(`${filePath} 上傳成功並設為公開訪問 ${bucketName}/${destinationWithExt}`);
      
      // 構建並返回公開訪問 URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
      return publicUrl;
    } catch (error) {
      console.error('上傳文件時發生錯誤:', error);
      throw error;
    }
  }

  async downloadFile(bucketName, fileName, destination) {
    try {
      await this.storage.bucket(bucketName).file(fileName).download({
        destination: destination,
      });
      console.log(`${fileName} 下載成功 ${bucketName}/${destination}`);
    } catch (error) {
      console.error('下載文件時發生錯誤:', error);
    }
  }

  async listFiles(bucketName) {
    try {
      const [files] = await this.storage.bucket(bucketName).getFiles();
      console.log('文件列表:');
      files.forEach(file => {
        console.log(file.name);
      });
    } catch (error) {
      console.error('列出文件時發生錯誤:', error);
    }
  }

  async deleteFile(bucketName, fileName) {
    try {
      await this.storage.bucket(bucketName).file(fileName).delete();
      console.log(`${fileName} 刪除成功`);
    } catch (error) {
      console.error('刪除文件時發生錯誤:', error);
    }
  }
}

module.exports = GcsUploader;