/**
 * oss-blog-theme 相关推荐（自主功能，客户端渲染）
 *
 * - 服务端 {{#get}} 无法返回 html/reading_time 字段（Ghost 内部序列化限制），
 *   因此阅读时长由客户端从共享内存索引（window.__ossBlogIndex）读取
 * - 规则：共享标签 + 排除当前文章，最多 3 篇；无结果显示空状态
 * - noscript / 索引不可用时回退到服务端兜底列表
 */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderCard(entry) {
    var tag = entry.tags[0];
    return '<article class="related-card">'
      + '<a class="related-card__link" href="' + escapeHtml(entry.url) + '">'
      + '<div class="related-card__meta">约 ' + entry.minutes + ' 分钟读完'
      + (tag ? ' · ' + escapeHtml(tag.name) : '') + '</div>'
      + '<h3 class="related-card__title">' + escapeHtml(entry.title) + '</h3>'
      + (entry.excerpt ? '<p class="related-card__excerpt">' + escapeHtml(entry.excerpt) + '</p>' : '')
      + '</a></article>';
  }

  function render(container, entries) {
    var list = container.querySelector('.related-posts__list');
    if (!entries.length) {
      list.innerHTML = '<p class="related-posts__empty">暂时没有同标签的其他文章。</p>';
      return;
    }
    list.innerHTML = entries.map(renderCard).join('');
  }

  function init() {
    var markers = document.querySelectorAll('script[data-related-posts]');
    if (!markers.length) return;

    markers.forEach(function (marker) {
      var section = marker.previousElementSibling;   // section.related-posts
      if (!section) return;
      var list = section.querySelector('.related-posts__list');
      if (!list) return;
      var tagSlugs = (marker.getAttribute('data-post-tags') || '').split(',').filter(Boolean);
      var selfId = marker.getAttribute('data-post-id');

      // blog-search.js 加载时即启动索引构建（Promise 已就绪）
      var indexPromise = window.__ossBlogIndex || window.__ossBlogIndexPromise;
      if (!indexPromise) return;   // 索引不可用：保留服务端 get 兜底列表
      indexPromise.then(function (index) {
        render(list, match(index, tagSlugs, selfId));
      }).catch(function () { /* 保留服务端兜底 */ });
    });
  }

  function match(index, tagSlugs, selfId) {
    if (!index) return [];
    return index.filter(function (entry) {
      if (entry.id === selfId) return false;
      var slugs = entry.tags.map(function (t) { return t.slug; });
      return tagSlugs.some(function (s) { return slugs.indexOf(s) !== -1; });
    }).slice(0, 3);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
