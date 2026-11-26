/**
 * oss-blog-theme 本地全文搜索（自主功能）
 *
 * - 数据源：Ghost Content API（公开只读 key，经 {{@custom.content_api_key}} 注入）
 * - 索引：浏览器内存索引（标题/摘要/正文纯文本/标签），断网可用
 * - 高亮：命中片段 <mark> 标记
 * - 无结果：标签建议 + 重试提示
 * - 索引同时暴露 window.__ossBlogIndex 供相关推荐（related-posts.js）复用
 */
(function () {
  'use strict';

  var panel = document.getElementById('search-panel');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var toggle = document.getElementById('search-toggle');
  var KEY = toggle ? toggle.getAttribute('data-content-key') : '';

  if (!panel || !input || !results) return;

  var cache = null;        // 内存索引缓存
  var lastFocus = null;

  // 中文阅读时长估算：中文 400 字/分钟，英文 200 词/分钟，每张图 12 秒
  function readingMinutes(html) {
    var text = String(html || '').replace(/<[^>]*>/g, ' ');
    var cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var enWords = (text.match(/[a-zA-Z]+/g) || []).length;
    var images = (String(html || '').match(/<img\s/g) || []).length;
    var minutes = cnChars / 400 + enWords / 200 + images * 12 / 60;
    return Math.max(1, Math.round(minutes));
  }

  function buildEntry(p) {
    var tags = (p.tags || []).map(function (t) { return { name: t.name, slug: t.slug }; });
    var minutes = p.reading_time || readingMinutes(p.html);
    return {
      id: p.id,
      title: p.title,
      url: p.url,
      excerpt: p.custom_excerpt || p.excerpt || '',
      text: (p.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000),
      tags: tags,
      minutes: minutes,
      haystack: [p.title, p.custom_excerpt || p.excerpt || '', (p.html || '').replace(/<[^>]*>/g, ' '), tags.map(function (t) { return t.name; }).join(' ')].join('\n').toLowerCase(),
    };
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, tokens) {
    var safe = escapeHtml(text);
    tokens.forEach(function (t) {
      if (!t) return;
      var pattern = new RegExp('(?![^<]*>)' + escapeRegExp(escapeHtml(t)), 'gi');
      safe = safe.replace(pattern, '<mark class="search-hit">$&</mark>');
    });
    return safe;
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tokenize(q) {
    return q.trim().split(/\s+/).filter(Boolean);
  }

  function fetchIndex() {
    if (cache) return Promise.resolve(cache);
    if (!KEY) {
      return Promise.reject(new Error('Content API key 未配置（请在管理端站点设置填写 content_api_key）'));
    }
    var url = '/ghost/api/content/posts/?key=' + encodeURIComponent(KEY) + '&limit=all&include=tags';
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        cache = (d.posts || []).map(buildEntry);
        window.__ossBlogIndex = cache;
        window.__ossBlogIndexPromise = Promise.resolve(cache);
        document.dispatchEvent(new CustomEvent('oss-blog:index-ready'));
        return cache;
      });
  }

  // 页面加载即构建索引（相关推荐依赖），搜索弹层复用同一 Promise
  window.__ossBlogIndexPromise = fetchIndex();
  window.__ossBlogIndexPromise.catch(function () { /* key 缺失或网络失败时静默，UI 已有降级 */ });

  function search(q) {
    var tokens = tokenize(q);
    if (!tokens.length) return { hits: [], tokens: [] };
    var hits = cache.filter(function (p) {
      return tokens.every(function (t) { return p.haystack.indexOf(t.toLowerCase()) !== -1; });
    });
    return { hits: hits, tokens: tokens };
  }

  function renderResult(p, tokens) {
    var el = document.createElement('a');
    el.className = 'search-result';
    el.href = p.url;
    el.innerHTML = '<div class="search-result__title">' + highlight(p.title, tokens) + '</div>'
      + '<div class="search-result__meta">' + (p.tags.length ? '标签：' + escapeHtml(p.tags.join('、')) : '无标签') + '</div>'
      + (p.excerpt ? '<p class="search-result__excerpt">' + highlight(p.excerpt, tokens) + '</p>' : '');
    return el;
  }

  function renderSuggestions(q) {
    var wrap = document.createElement('div');
    wrap.className = 'search-empty';
    var tagNames = {};
    cache.forEach(function (p) { p.tags.forEach(function (t) { tagNames[t] = true; }); });
    var suggestions = Object.keys(tagNames).slice(0, 5);
    wrap.innerHTML = '<p>没有找到与「' + escapeHtml(q) + '」相关的文章。</p>'
      + '<p class="search-empty__suggestion">试试这些标签或换个关键词：</p>';
    var sug = document.createElement('p');
    sug.className = 'search-empty__suggestion';
    suggestions.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', function () {
        input.value = t;
        run(t);
      });
      sug.appendChild(b);
    });
    wrap.appendChild(sug);
    return wrap;
  }

  function run(q) {
    results.innerHTML = '';
    var tokens = tokenize(q);
    if (!tokens.length) return;
    var out = search(q);
    if (!out.hits.length) {
      results.appendChild(renderSuggestions(q));
      return;
    }
    var status = document.createElement('div');
    status.className = 'search-status';
    status.textContent = '找到 ' + out.hits.length + ' 篇相关文章';
    results.appendChild(status);
    out.hits.forEach(function (p) { results.appendChild(renderResult(p, out.tokens)); });
  }

  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
    window.__ossBlogIndexPromise.catch(function (e) {
      results.innerHTML = '<div class="search-empty"><p>搜索数据加载失败：' + escapeHtml(e.message) + '</p></div>';
    });
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    input.value = '';
    results.innerHTML = '';
    if (lastFocus) lastFocus.focus();
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) open(); else close();
  });

  input.addEventListener('input', function () { run(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var first = results.querySelector('.search-result');
      if (first) first.click();
    }
  });

  panel.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-search-close')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
    // Ctrl/⌘ + K 快捷键打开搜索
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (panel.hidden) open(); else close();
    }
  });
})();
