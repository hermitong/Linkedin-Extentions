console.log("LinkedIn职位爬取器内容脚本已加载");

let scrapedData = null;
const MAX_PAGES = 15;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("收到消息:", request);
  if (request.action === 'scrapeJobs') {
    console.log("开始爬取职位信息");
    scrapeJobListings()
      .then((jobListings) => {
        if (jobListings.length > 0) {
          scrapedData = jobListings;
          console.log("爬取成功，发送响应");
          chrome.runtime.sendMessage({action: 'saveJobData', data: jobListings});
          sendResponse({status: 'success', count: jobListings.length});
        } else {
          console.log("未找到任何职位信息");
          sendResponse({status: 'error', message: '未找到任何职位信息'});
        }
      })
      .catch((error) => {
        console.error("爬取过程中发生错误:", error);
        sendResponse({status: 'error', message: '爬取过程中发生错误: ' + error.message});
      });
    return true; // 保持消息通道开放，以支持异步响应
  } else if (request.action === 'downloadCSV') {
    if (scrapedData) {
      downloadCSV(scrapedData, 'linkedin_jobs.csv');
      sendResponse({status: 'success'});
    } else {
      console.log("没有数据可供下载");
      sendResponse({status: 'error', message: '没有数据可供下载'});
    }
    return true; // 保持消息通道开放
  }
});

async function scrapeJobListings(maxPages = MAX_PAGES) {
  let allJobListings = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    console.log(`开始爬取第 ${currentPage} 页`);
    chrome.runtime.sendMessage({
      action: 'updatePageProgress',
      currentPage: currentPage,
      totalPages: maxPages
    });

    const jobListings = await scrapeCurrentPage();
    allJobListings = allJobListings.concat(jobListings);

    if (jobListings.length === 0 || !await hasNextPage()) {
      console.log("没有更多页面或已达到最大页数");
      break;
    }

    await goToNextPage();
    currentPage++;

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return allJobListings;
}

async function hasNextPage() {
  return new Promise(resolve => {
    const nextButton = document.querySelector('button[aria-label="下一页"]');
    resolve(nextButton && !nextButton.disabled);
  });
}

async function goToNextPage() {
  return new Promise(resolve => {
    const nextButton = document.querySelector('button[aria-label="下一页"]');
    if (nextButton && !nextButton.disabled) {
      nextButton.click();
      setTimeout(resolve, 3000); // 等待页面加载
    } else {
      resolve();
    }
  });
}

function scrapeCurrentPage() {
  return new Promise((resolve) => {
    const jobListings = [];
    console.log("开始爬取当前页面职位信息");

    const jobCards = document.querySelectorAll('li.jobs-search-results__list-item');
    console.log(`找到 ${jobCards.length} 个职位卡片`);

    jobCards.forEach((card, index) => {
      const titleElement = card.querySelector('a.job-card-list__title');
      const companyElement = card.querySelector('span.job-card-container__primary-description');
      const locationElement = card.querySelector('li.job-card-container__metadata-item');
      const linkElement = titleElement;
      const descriptionElement = card.querySelector('.job-card-list__description');
      const skillsElement = card.querySelector('.job-card-list__skills');
      const companyLogoElement = card.querySelector('.job-card-container__company-logo');

      if (titleElement && companyElement) {
        const jobInfo = {
          title: titleElement.textContent.trim(),
          company: companyElement.textContent.trim(),
          location: locationElement ? locationElement.textContent.trim() : 'N/A',
          link: linkElement ? linkElement.href : 'N/A',
          description: descriptionElement ? descriptionElement.textContent.trim() : '',
          skills: skillsElement ? skillsElement.textContent.trim() : '',
          companyLogo: companyLogoElement ? companyLogoElement.src : ''
        };
        console.log(`职位 ${index + 1}:`, jobInfo);
        jobListings.push(jobInfo);
      } else {
        console.log(`职位 ${index + 1} 信息不完整，跳过`);
      }

      const progress = Math.round(((index + 1) / jobCards.length) * 100);
      console.log(`当前页面爬取进度: ${progress}%`);
      chrome.runtime.sendMessage({action: 'updateProgress', progress: progress});
    });

    resolve(jobListings);
  });
}

function downloadCSV(data, filename) {
  const headers = [
    "Title", "Description", "Description HTML", "Primary Description", "Detail URL",
    "Location", "Skills", "Insight", "Job State", "Poster Id", "Company Name",
    "Company Logo", "Company Apply Url", "Created At", "Scraped At"
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.description ? item.description.replace(/"/g, '""').replace(/\n/g, ' ') : ''}"`,
      `""`, // Description HTML
      `""`, // Primary Description
      `"${item.link}"`,
      `"${item.location}"`,
      `"Skills: ${item.skills || ''}"`,
      `""`, // Insight
      `"LISTED"`,
      `""`, // Poster Id
      `"${item.company}"`,
      `"${item.companyLogo || ''}"`,
      `"${item.link}"`, // Company Apply Url
      `"${new Date().toISOString()}"`, // Created At
      `"${new Date().toISOString()}"` // Scraped At
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  chrome.runtime.sendMessage({action: 'downloadCSV', url: url, filename: filename});
}