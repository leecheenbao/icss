/**
 * 檢查必要參數是否存在
 * @param {Object} body - 請求體
 * @param {string[]} requiredParams - 必要參數列表
 * @returns {string[]} 缺少的參數列表
 */
const checkRequiredParams = (body, requiredParams) => {
  const missingParams = requiredParams.filter((param) => !body[param]);
  return missingParams;
};

module.exports = {
  checkRequiredParams,
};
