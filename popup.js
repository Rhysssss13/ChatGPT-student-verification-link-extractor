const result = document.querySelector('#result');
const title = document.querySelector('#page-title');
const refresh = document.querySelector('#refresh');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function render(items) {
  if (!items.length) {
    result.innerHTML = '<div class="empty">没有找到可提取的链接。请在 ChatGPT 学生验证页或 SheerID 页面重新打开扩展。</div>';
    return;
  }
  result.innerHTML = items.map((item, index) => `
    <article class="item">
      <div class="item-head"><span class="label">${escapeHtml(item.label)}</span><button class="copy" data-index="${index}">复制</button></div>
      <div class="url" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</div>
    </article>`).join('');
  result.querySelectorAll('.copy').forEach(button => button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(items[Number(button.dataset.index)].url);
    button.textContent = '已复制';
    button.classList.add('done');
    setTimeout(() => { button.textContent = '复制'; button.classList.remove('done'); }, 1200);
  }));
}

async function extract() {
  result.textContent = '正在提取…';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  title.textContent = tab?.title || tab?.url || '当前页面';
  if (!tab?.id) { result.innerHTML = '<div class="error">无法读取当前标签页。</div>'; return; }
  try {
    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const found = [];
        const add = (label, url) => {
          if (!url || !/^https?:/i.test(url) || found.some(item => item.url === url)) return;
          found.push({ label, url });
        };
        add('当前页面', location.href);
        document.querySelectorAll('iframe[src]').forEach(frame => add('iframe 验证链接', frame.src));
        return found.sort((a, b) => {
          const score = item => /sheerid|students\/claim|students\/verify/i.test(item.url) ? 0 : 1;
          return score(a) - score(b);
        });
      }
    });
    render(response[0]?.result || []);
  } catch (error) {
    result.innerHTML = '<div class="error">当前页面禁止扩展读取。请切换到普通网页后重试。</div>';
  }
}

refresh.addEventListener('click', extract);
extract();
