let statusDiv, progressBar, progressText, progressDiv, scrapeButton, downloadButton;

document.addEventListener('DOMContentLoaded', function() {
  console.log("Popup DOM fully loaded");
  scrapeButton = document.getElementById('scrapeButton');
  downloadButton = document.getElementById('downloadButton');
  statusDiv = document.getElementById('status');
  progressBar = document.getElementById('progressBar');
  progressText = document.getElementById('progressText');
  progressDiv = document.getElementById('progress');

  if (scrapeButton) {
    scrapeButton.addEventListener('click', handleScrapeButtonClick);
  } else {
    console.error("Scrape button not found");
  }

  if (downloadButton) {
    downloadButton.addEventListener('click', handleDownloadButtonClick);
  } else {
    console.error("Download button not found");
  }
});

function handleScrapeButtonClick() {
  console.log("Scrape button clicked");
  if (!statusDiv || !progressDiv || !progressBar || !progressText || !downloadButton) {
    console.error("Some UI elements are missing");
    return;
  }

  statusDiv.textContent = '正在准备爬取...';
  downloadButton.style.display = 'none';
  progressDiv.style.display = 'block';
  progressBar.value = 0;
  progressText.textContent = '0%';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError);
      handleScrapeResponse(null);
      return;
    }

    const activeTab = tabs[0];
    if (!activeTab) {
      console.error("No active tab found");
      handleScrapeResponse(null);
      return;
    }

    console.log("Active tab URL:", activeTab.url);
    if (activeTab.url.includes("linkedin.com/jobs")) {
      console.log("LinkedIn jobs page detected");
      statusDiv.textContent = '正在爬取...';

      try {
        chrome.tabs.sendMessage(activeTab.id, {action: 'scrapeJobs'}, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error in sendMessage callback:", chrome.runtime.lastError);
            handleScrapeResponse(null);
          } else {
            console.log("Received response from content script:", response);
            handleScrapeResponse(response);
          }
        });
      } catch (error) {
        console.error("Error in sendMessage:", error);
        handleScrapeResponse(null);
      }
    } else {
      console.log("Not a LinkedIn jobs page");
      statusDiv.textContent = '请在LinkedIn职位页面上使用此插件。';
    }
  });
}

function handleDownloadButtonClick() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError);
      return;
    }

    const activeTab = tabs[0];
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, {action: 'downloadCSV'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
      } else if (response && response.status === 'success') {
        console.log("CSV file download initiated");
      } else {
        console.error("Failed to initiate CSV file download:", response ? response.message : "Unknown error");
      }
    });
  });
}

function handleScrapeResponse(response) {
  console.log("Message sent to content script, response:", response);
  if (!statusDiv || !downloadButton) {
    console.error("Status div or download button not found");
    return;
  }
  if (!response) {
    statusDiv.textContent = '爬取过程中发生错误，请检查控制台日志并重试。';
  } else if (response.status === 'success') {
    statusDiv.textContent = `成功爬取 ${response.count} 个职位信息！`;
    downloadButton.style.display = 'block';
  } else if (response.status === 'error') {
    statusDiv.textContent = `爬取失败：${response.message}`;
  } else {
    statusDiv.textContent = '爬取过程中发生未知错误，请检查控制台日志并重试。';
    console.error('未知错误：', response);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in popup:", request);
  if (request.action === 'updateProgress') {
    if (progressBar && progressText) {
      progressBar.value = request.progress;
      progressText.textContent = `${request.progress}%`;
    } else {
      console.error("Progress elements not found");
    }
  } else if (request.action === 'updatePageProgress') {
    if (statusDiv) {
      statusDiv.textContent = `正在爬取第 ${request.currentPage} 页，共 ${request.totalPages} 页`;
    } else {
      console.error("Status div not found");
    }
  }
});