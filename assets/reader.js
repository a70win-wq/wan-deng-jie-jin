/* ============================================================
   《萬燈皆燼》全站共用腳本 (reader.js)
   純靜態原生 JS・無外部依賴・GitHub Pages 相容
   ============================================================ */

(function () {
  'use strict';

  // 1. 主題切換 (dark -> paper -> light -> dark)
  const THEMES = ['dark', 'paper', 'light'];
  const THEME_NAMES = { dark: '夜間深色', paper: '宣紙護眼', light: '純淨素白' };
  const THEME_ICONS = { dark: '🌙', paper: '📜', light: '☀️' };

  function initTheme() {
    const savedTheme = localStorage.getItem('nov_theme') || 'dark';
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
        const nextTheme = THEMES[nextIndex];
        applyTheme(nextTheme);
        localStorage.setItem('nov_theme', nextTheme);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      const iconSpan = themeToggleBtn.querySelector('.theme-icon');
      if (iconSpan) iconSpan.textContent = THEME_ICONS[theme] || '🌙';
      themeToggleBtn.setAttribute('title', '切換主題（目前：' + (THEME_NAMES[theme] || theme) + '）');
    }
  }

  // 2. 字體大小調節 (16px ~ 24px)
  const FONT_SIZES = [16, 17, 18, 19, 20, 22, 24];
  function initFontSize() {
    let currentSize = parseInt(localStorage.getItem('nov_fontsize') || '19', 10);
    applyFontSize(currentSize);

    const incBtn = document.getElementById('font-inc');
    const decBtn = document.getElementById('font-dec');

    if (incBtn) {
      incBtn.addEventListener('click', function () {
        const idx = FONT_SIZES.indexOf(currentSize);
        if (idx < FONT_SIZES.length - 1) {
          currentSize = FONT_SIZES[idx + 1];
          applyFontSize(currentSize);
          localStorage.setItem('nov_fontsize', currentSize);
        }
      });
    }

    if (decBtn) {
      decBtn.addEventListener('click', function () {
        const idx = FONT_SIZES.indexOf(currentSize);
        if (idx > 0) {
          currentSize = FONT_SIZES[idx - 1];
          applyFontSize(currentSize);
          localStorage.setItem('nov_fontsize', currentSize);
        }
      });
    }
  }

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--font-size', size + 'px');
  }

  // 3. 閱讀滾動進度條
  function initScrollProgress() {
    const progressBar = document.getElementById('read-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', function () {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        progressBar.style.width = '0%';
        return;
      }
      const scrollPercent = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
      progressBar.style.width = scrollPercent.toFixed(1) + '%';
    }, { passive: true });
  }

  // 4. 章節鍵盤翻頁 (← 上一章, → 下一章, Esc/M 回目錄)
  function initKeyboardNav() {
    window.addEventListener('keydown', function (e) {
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === 'ArrowLeft') {
        const prevBtn = document.querySelector('.nav-btn.prev-btn[href]');
        if (prevBtn) {
          e.preventDefault();
          window.location.href = prevBtn.href;
        }
      } else if (e.key === 'ArrowRight') {
        const nextBtn = document.querySelector('.nav-btn.next-btn[href]');
        if (nextBtn) {
          e.preventDefault();
          window.location.href = nextBtn.href;
        }
      } else if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        const tocBtn = document.querySelector('.nav-btn.toc-btn[href], .header-btn[href]');
        if (tocBtn) {
          e.preventDefault();
          window.location.href = tocBtn.href;
        }
      }
    });
  }

  // 5. 記錄與讀取上次閱讀章節
  function initReadingRecord() {
    // 若在正文頁，儲存目前閱讀進度
    const chapterDataElem = document.getElementById('chapter-data');
    if (chapterDataElem) {
      const code = chapterDataElem.getAttribute('data-code');
      const title = chapterDataElem.getAttribute('data-title');
      const num = chapterDataElem.getAttribute('data-num');
      try {
        localStorage.setItem('nov_last_read', JSON.stringify({
          code: code,
          title: title,
          num: num,
          url: 'chapters/' + code + '.html',
          timestamp: Date.now()
        }));
      } catch (err) {}
    }

    // 若在目錄首頁，讀取進度並更新「繼續閱讀」按鈕與標記
    const continueBtn = document.getElementById('btn-continue');
    const rawRecord = localStorage.getItem('nov_last_read');
    if (rawRecord) {
      try {
        const record = JSON.parse(rawRecord);
        if (record && record.code) {
          if (continueBtn) {
            continueBtn.style.display = 'inline-flex';
            continueBtn.href = 'chapters/' + record.code + '.html';
            continueBtn.innerHTML = '📖 繼續閱讀：' + (record.title || ('第 ' + record.num + ' 章'));
          }
          // 在目錄中高亮上次閱讀的章節卡片
          const targetCard = document.querySelector('.chapter-card[data-code="' + record.code + '"]');
          if (targetCard) {
            targetCard.classList.add('is-last-read');
            const cardCode = targetCard.querySelector('.card-code');
            if (cardCode) {
              cardCode.title = '上次閱讀章節';
            }
          }
        }
      } catch (err) {}
    }
  }

  // 6. 首頁目錄搜尋與分卷篩選
  function initTocFeatures() {
    const searchInput = document.getElementById('chapter-search');
    const clearBtn = document.getElementById('search-clear');
    const volTabs = document.querySelectorAll('.vol-tab');
    const volSections = document.querySelectorAll('.volume-section');
    const chapterCards = document.querySelectorAll('.chapter-card');
    const countDisplay = document.getElementById('toc-count');
    const noResults = document.getElementById('no-results');

    if (!searchInput) return;

    let activeVol = 'all';

    function performFilter() {
      const query = searchInput.value.trim().toLowerCase();
      let matchCount = 0;

      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
      }

      volSections.forEach(function (sec) {
        const volNum = sec.getAttribute('data-vol-num');
        const cards = sec.querySelectorAll('.chapter-card');
        let secVisibleCount = 0;

        cards.forEach(function (card) {
          const title = (card.getAttribute('data-title') || '').toLowerCase();
          const code = (card.getAttribute('data-code') || '').toLowerCase();
          const num = (card.getAttribute('data-num') || '').toLowerCase();

          // 判斷是否符合分卷標籤
          const matchVol = (activeVol === 'all' || activeVol === volNum);

          // 判斷是否符合搜尋關鍵字
          const matchQuery = !query || title.includes(query) || code.includes(query) || num.includes(query);

          if (matchVol && matchQuery) {
            card.style.display = 'flex';
            secVisibleCount++;
            matchCount++;
          } else {
            card.style.display = 'none';
          }
        });

        // 若該卷內沒有符合卡片，則隱藏該卷標題與容器
        if (secVisibleCount > 0) {
          sec.style.display = 'block';
        } else {
          sec.style.display = 'none';
        }
      });

      // 更新計數顯示
      if (countDisplay) {
        if (query) {
          countDisplay.textContent = '找到 ' + matchCount + ' 章';
        } else if (activeVol !== 'all') {
          countDisplay.textContent = '此卷共 ' + matchCount + ' 章';
        } else {
          countDisplay.textContent = '全 365 章';
        }
      }

      // 無搜尋結果提示
      if (noResults) {
        noResults.style.display = (matchCount === 0) ? 'block' : 'none';
        const kwSpan = document.getElementById('search-keyword');
        if (kwSpan) kwSpan.textContent = query;
      }
    }

    // 搜尋輸入監聽
    searchInput.addEventListener('input', performFilter);

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        performFilter();
        searchInput.focus();
      });
    }

    // 分卷切換按鈕
    volTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        volTabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        activeVol = tab.getAttribute('data-vol');
        performFilter();

        // 點擊特定卷別時平滑滾動到目錄區頂端
        if (activeVol !== 'all') {
          const targetSec = document.getElementById('vol-' + activeVol);
          if (targetSec) {
            targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  }

  // 7. 回到頂部按鈕
  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // DOM 載入完成初始化各模組
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initFontSize();
    initScrollProgress();
    initKeyboardNav();
    initReadingRecord();
    initTocFeatures();
    initBackToTop();
  });
})();
