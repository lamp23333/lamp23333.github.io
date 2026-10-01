/* =========================================================
   全站多语言系统（单页内切换，不跳转页面）
   - 首次进入：按 URL 参数 ?lang= → 上次选择 → 浏览器语言 顺序判断
   - 手动切换：记住选择（localStorage），并同步到 URL
   用法：
     1) 页面引入 <script src="lang.js"></script>
     2) 需要翻译的元素加 data-i18n="键名"
     3) 语言菜单按钮加 data-lang="zh / zh-tw / en"
   ========================================================= */
(function () {
  var I18N = {
    zh: {
      htmlLang: 'zh-Hans',
      pageTitle: 'LAMP白炽灯 - 个人网站',
      siteName: 'LAMP白炽灯',
      heading: '欢迎来到LAMP白炽灯的个人网站！',
      p1: '我一直想拥有一个个人网站，却常常因为申请正规域名和网络服务器需要长期付费而却步，直到我遇见了 GitHub Pages。',
      p2: '好吧我其实痛恨自己为什么没有早点发现 GitHub 还有这种功能。',
      p3: '我是一名来自中国的大学生，热爱科技，热爱创新，热爱游戏，热爱二次元，热爱电音，热爱生活。我向往那些年轻创作者的不凡，我想成为他们那样的人。',
      p4: '我目前不具有能够支持我行动的技能，我不会写代码，不会绘画，不会编曲，不会开发游戏，不会管理团队。我想付出一切代价去学，但我也和其他平凡的大学生一样，有着繁忙的学业、激烈的竞争、外界的压力、普通的家境。我知道现在的我只是在纸上谈兵罢了，因此我非常希望自己能尽快有这样的专业能力。',
      p5: '也许是为了能够快一点达成目标，我从现在开始就做了一些准备。也许是分享欲的原因，我创建了这个网站，并把我的成果放在这里。虽然不会有什么人来看。',
      p6: '哦对了，我说过我什么也不会，那么这些成果从哪儿来的呢？其实是AI生成的。',
      p7: '虽然我不认为AI可以替代一切事业，但在概念性想法直接转变为实质性内容这方面，我只能说AI还是太好用了。然而如果在未来我真的开始投入创作的话，我绝对不会在创意方面使用它。',
      p8: '想说的就这么多，希望来到这里的人可以谅解一下我在这个网站中展示的一切幼稚又可笑的想法。',
      p9: '感谢相遇。',
      navTitle: '导航',
      nav1: '项目展示',
      nav2: '关于我',
      nf1: '很抱歉，您请求的页面无法找到。',
      nf2: '可能网址有误，或该页面已不存在。',
      nfBack: '返回主页',
      dshHeading: '一键补丁脚本，让 DeepSeek Harness 在 Android Termux 环境正常运行。',
      dshCta: '查看 GitHub 仓库'
    },

    'zh-tw': {
      htmlLang: 'zh-Hant',
      pageTitle: 'lamp23333 - 個人網站',
      siteName: 'lamp23333',
      heading: '歡迎來到lamp23333的個人網站！',
      p1: '我一直想擁有一個個人網站，卻常常因為申請正規域名和網絡伺服器需要長期付費而卻步，直到我遇見了 GitHub Pages。',
      p2: '好吧，我其實痛恨自己為什麼沒有早點發現 GitHub 還有這種功能。',
      p3: '我是一名來自中國的大學生，熱愛科技，熱愛創新，熱愛遊戲，熱愛二次元，熱愛電音，熱愛生活。我嚮往那些年輕創作者的不凡，我想成為他們那樣的人。',
      p4: '我目前不具有能夠支撐我行動的技能，我不會寫程式，不會繪畫，不會編曲，不會開發遊戲，不會管理團隊。我想付出一切代價去學，但我也和其他平凡的大學生一樣，有著繁忙的學業、激烈的競爭、外界的壓力、普通的家境。我知道現在的我只是在紙上談兵罷了，因此我非常希望自己能盡快有這樣的專業能力。',
      p5: '也許是為了能夠快一點達成目標，我從現在開始就做了一些準備。也許是分享慾的原因，我創建了這個網站，並把我的成果放在這裡。雖然不會有什麼人來看。',
      p6: '哦對了，我說過我什麼也不會，那麼這些成果從哪兒來的？其實是AI生成的。',
      p7: '雖然我不認為AI可以替代一切事業，但在概念性想法直接轉變為實質性內容這方面，我只能說AI還是太好用了。然而如果在未來我真的開始投入創作的話，我絕對不會在創意方面使用它。',
      p8: '想說的就這麼多，希望來到這裡的人可以諒解一下我在這個網站中展示的一切幼稚又可笑的想法。',
      p9: '感謝相遇。',
      navTitle: '導航',
      nav1: '項目展示',
      nav2: '關於我',
      nf1: '很抱歉，您請求的頁面無法找到。',
      nf2: '可能網址有誤，或該頁面已不存在。',
      nfBack: '返回主頁',
      dshHeading: '一鍵補丁腳本，讓 DeepSeek Harness 在 Android Termux 環境正常運行。',
      dshCta: '查看 GitHub 倉庫'
    },

    en: {
      htmlLang: 'en-US',
      pageTitle: 'lamp23333 - Personal Website',
      siteName: 'lamp23333',
      heading: "Welcome to lamp23333's website!",
      p1: "I've always wanted to have a personal website, but I was often held back by the recurring costs of registering a formal domain and paying for web hosting—until I discovered GitHub Pages.",
      p2: "Honestly, I hate myself for not finding out earlier that GitHub could do something like this.",
      p3: "I'm a university student from China, passionate about technology, innovation, gaming, anime, electronic music, and my life. I admire the extraordinary young creators out there and want to become someone like them.",
      p4: "Right now, I don't have the skills to support my ambitions. I can't code, draw, make music, develop games, or manage a team. I'm willing to give everything to learn, but like any ordinary university student in China, I'm caught up in a busy academic schedule, intense competition, external pressures, and a modest family background. I know that I might seem to be just an armchair strategist, so I really desire to gain that kind of professional ability as soon as possible.",
      p5: "Perhaps to reach my goals a little sooner, I've already started making some preparations. Perhaps out of a desire to share, I created this site and put my work here—even though hardly anyone will see it.",
      p6: "By the way, I said I can't do anything, so where does my work come from? Well, it's AI-generated.",
      p7: "Although I don't believe AI can replace all endeavors, when it comes to turning conceptual ideas directly into tangible content, I have to admit AI is incredibly useful. However, if I ever truly start creating in the future, I won't use it for the imaginative aspects.",
      p8: "That's all I wanted to say. I hope anyone who visits can understand—and maybe forgive—the naive and perhaps laughable ideas I'm sharing here.",
      p9: "Thanks for stopping by.",
      navTitle: 'Navigation',
      nav1: 'Projects',
      nav2: 'About Me',
      nf1: 'We are sorry, the page you requested cannot be found.',
      nf2: "The URL may be misspelled or the page you're looking for is no longer available.",
      nfBack: 'Back to Home',
      dshHeading: 'A one-click patch script that gets DeepSeek Harness running properly in an Android Termux environment.',
      dshCta: 'View GitHub Repository'
    }
  };

  var STORAGE_KEY = 'lamp-site-lang';
  var DEFAULT_LANG = 'zh';

  /* 语言判断优先级：URL 参数 > 上次选择 > 浏览器语言 > 默认 */
  function detectLang() {
    var q = null;
    try {
      q = new URLSearchParams(location.search).get('lang');
    } catch (e) {}
    if (q && I18N[q]) return q;

    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (saved && I18N[saved]) return saved;

    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('zh-tw') === 0 || nav.indexOf('zh-hk') === 0 || nav.indexOf('zh-hant') === 0) return 'zh-tw';
    if (nav.indexOf('zh') === 0) return 'zh';
    if (nav.indexOf('en') === 0) return 'en';

    return DEFAULT_LANG;
  }

  function apply(lang, save) {
    var t = I18N[lang] || I18N[DEFAULT_LANG];

    document.documentElement.lang = t.htmlLang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });

    document.querySelectorAll('.lang-menu button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {}
      try {
        var url = new URL(location.href);
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
      } catch (e) {}
    }
  }

  /* —— 顶栏语言菜单交互 —— */
  var btn = document.querySelector('.lang-btn');
  var dropdown = document.querySelector('.lang-dropdown');

  if (btn && dropdown) {
    var openedAt = 0;

    function closeMenu() {
      dropdown.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle('active');
      if (open) openedAt = Date.now();
      btn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', closeMenu);

    /* 页面滚动时自动收起（忽略刚打开的一瞬，避免惯性滚动把菜单秒关） */
    window.addEventListener('scroll', function () {
      if (!dropdown.classList.contains('active')) return;
      if (Date.now() - openedAt < 250) return;
      closeMenu();
    }, { passive: true });

    document.querySelectorAll('.lang-menu button').forEach(function (item) {
      item.addEventListener('click', function () {
        apply(item.dataset.lang, true);
        closeMenu();
      });
    });
  }

  /* —— 初始应用 —— */
  apply(detectLang(), false);
})();