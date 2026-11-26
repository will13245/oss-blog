/**
 * oss-blog-theme 基础交互：移动端导航折叠
 * 搜索弹层与全文检索逻辑见 blog-search.js（feature/blog-enhancement 分支）
 */
(function () {
  'use strict';

  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
  }
})();
