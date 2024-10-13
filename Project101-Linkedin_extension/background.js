// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn职位爬取插件已安装或更新');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadCSV') {
    chrome.storage.local.get('jobData', (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving job data:", chrome.runtime.lastError);
        sendResponse({status: 'error', message: chrome.runtime.lastError.message});
      } else if (data.jobData) {
        downloadCSV(data.jobData, 'linkedin_jobs.csv');
        sendResponse({status: 'success'});
      } else {
        console.error("No job data found");
        sendResponse({status: 'error', message: 'No job data found'});
      }
    });
    return true; // 保持消息通道开放
  }
});

// 保存职位数据的函数
function saveJobData(data) {
  chrome.storage.local.set({jobData: data}, () => {
    console.log('职位数据已保存');
  });
}

// 下载CSV文件的函数
function downloadCSV(url, filename) {
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('下载CSV文件时发生错误:', chrome.runtime.lastError);
    } else {
      console.log('CSV文件下载已开始，下载ID:', downloadId);
    }
  });
}


// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJobData') {
    // 处理保存职位数据的逻辑
    saveJobData(request.data);
    sendResponse({status: 'success'});
  } else if (request.action === 'downloadCSV') {
    // 处理下载CSV文件的逻辑
    downloadCSV(request.url, request.filename);
    sendResponse({status: 'success'});
  }
  return true; // 保持消息通道开放
});