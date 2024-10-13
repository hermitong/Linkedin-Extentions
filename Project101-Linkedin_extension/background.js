chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn职位爬取插件已安装或更新');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadCSV') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载CSV文件时发生错误:', chrome.runtime.lastError);
        sendResponse({status: 'error', message: chrome.runtime.lastError.message});
      } else {
        console.log('CSV文件下载已开始，下载ID:', downloadId);
        sendResponse({status: 'success', downloadId: downloadId});
      }
    });
    return true; // 保持消息通道开放
  } else if (request.action === 'saveJobData') {
    chrome.storage.local.set({jobData: request.data}, () => {
      if (chrome.runtime.lastError) {
        console.error('保存职位数据时发生错误:', chrome.runtime.lastError);
        sendResponse({status: 'error', message: chrome.runtime.lastError.message});
      } else {
        console.log('职位数据已保存');
        sendResponse({status: 'success'});
      }
    });
    return true; // 保持消息通道开放
  }
});