/* ==========================================================================
   생각의 방 — 발표 엔진 (외부 라이브러리 없음, 인터넷 없이 동작)

   조작
     →  Space  Enter  PageDown : 다음 슬라이드 (요소는 슬라이드에 들어오면 한꺼번에 나타남)
     ←  ↑  Backspace  PageUp   : 이전 (마우스: 왼쪽 가장자리 클릭, 오른쪽 클릭, 움직이면 나타나는 ← 버튼, 진행 바 칸 클릭)
     Home / End                : 처음 / 마지막 슬라이드
     F                         : 전체 화면
     T                         : 타이머 보이기/숨기기 (목표 4분 30초)
     R                         : 타이머 초기화
     N                         : 발표자 노트(연습용, 청중 화면에는 켜지 말 것)
     H 또는 ?                  : 도움말
   주소 뒤에 #5 를 붙이면 5번 슬라이드부터 시작한다.
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var secEl = document.getElementById('sec');
  var cntEl = document.getElementById('count');
  var progEl = document.getElementById('progress');
  var timerEl = document.getElementById('timer');
  var notesEl = document.getElementById('notes');
  var helpEl = document.getElementById('help');
  var navEl = document.getElementById('nav');
  var navN = document.getElementById('nav-n');
  var N = slides.length;
  var TARGET = 270; // 목표 시간(초)

  /* ---------- 설정 ----------
     STEP_MODE : true 로 바꾸면 예전처럼 → 를 누를 때마다 요소가 하나씩 나타난다.
                 false(기본)이면 슬라이드에 들어오는 순간 모든 요소가 차례로 짧게 나타난다.
     SPEED     : 요소별 지연 시간 배율. 작을수록 빠르다. (1 = 원래 속도)
     STAGGER   : 한 슬라이드 안에서 요소 사이의 간격(초). 0 이면 완전히 동시에 나타난다.
     TYPE_MS   : 질문 슬라이드 타이핑 속도(글자당 밀리초). */
  var STEP_MODE = false;
  var SPEED = 0.45;
  var STAGGER = 0.1;
  var TYPE_MS = 16;

  var cur = -1;
  var step = 0;
  var t0 = null;
  var timerId = null;

  /* ---------- 슬라이드별 단계 수 ---------- */
  var maxStep = slides.map(function (s) {
    var m = 0;
    Array.prototype.forEach.call(s.querySelectorAll('[data-step]'), function (e) {
      m = Math.max(m, +e.getAttribute('data-step'));
    });
    return STEP_MODE ? m : 0;
  });

  /* ---------- 화면 맞춤 ---------- */
  function fit() {
    var k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- 진행 바 ---------- */
  for (var i = 0; i < N; i++) {
    (function (n) {
      var seg = document.createElement('i');
      seg.title = (n + 1) + '번 슬라이드로 이동';
      seg.addEventListener('click', function (e) { e.stopPropagation(); go(n, 0); });
      progEl.appendChild(seg);
    })(i);
  }
  var segs = progEl.children;

  /* ---------- 등장 지연 보정 ---------- */
  slides.forEach(function (s) {
    Array.prototype.forEach.call(s.querySelectorAll('.a'), function (el) {
      var d = parseFloat(el.style.getPropertyValue('--d')) || 0;
      var st = el.hasAttribute('data-step') ? +el.getAttribute('data-step') : 0;
      var extra = (!STEP_MODE && st > 0) ? 0.1 + (st - 1) * STAGGER : 0;
      el.style.setProperty('--d', (d * SPEED + extra).toFixed(2) + 's');
    });
  });

  /* ---------- 타자기 효과 ---------- */
  slides.forEach(function (s) {
    Array.prototype.forEach.call(s.querySelectorAll('.ty'), function (el) {
      el._src = el.innerHTML.replace(/\s*\n\s*/g, '');
    });
  });

  function splitChars(root) {
    var chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(n.textContent).forEach(function (ch) {
            var sp = document.createElement('span');
            sp.className = 'c';
            sp.textContent = ch;
            frag.appendChild(sp);
            chars.push(sp);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(root);
    return chars;
  }

  function typeIn(el, instant) {
    var token = (el._tok || 0) + 1;
    el._tok = token;
    el.innerHTML = el._src;
    var chars = splitChars(el);
    if (instant) {
      chars.forEach(function (c) { c.classList.add('on'); });
      return;
    }
    var caret = document.createElement('span');
    caret.className = 'caret';
    var i = 0;
    function tick() {
      if (el._tok !== token) return;
      if (i < chars.length) {
        var c = chars[i++];
        c.classList.add('on');
        c.parentNode.insertBefore(caret, c.nextSibling);
        setTimeout(tick, /\s/.test(c.textContent) ? Math.round(TYPE_MS / 3) : TYPE_MS);
      }
    }
    setTimeout(tick, 100);
  }

  /* ---------- 숫자 올라가기 ---------- */
  function fmt(v, el) {
    return el.getAttribute('data-fmt') === 'comma' ? Math.round(v).toLocaleString('en-US') : String(Math.round(v));
  }
  function resetCount(el) {
    el._done = false;
    el._raf && cancelAnimationFrame(el._raf);
    el.textContent = fmt(0, el);
  }
  function runCount(el, instant) {
    if (el._done) return;
    el._done = true;
    var to = +el.getAttribute('data-count');
    if (instant) { el.textContent = fmt(to, el); return; }
    var dur = +(el.getAttribute('data-dur') || 1200);
    var host = el.closest('.a');
    var delay = host ? (parseFloat(getComputedStyle(host).getPropertyValue('--d')) || 0) * 1000 : 0;
    var start = performance.now() + delay + 250;
    function f(now) {
      var p = Math.max(0, Math.min(1, (now - start) / dur));
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e, el);
      if (p < 1) el._raf = requestAnimationFrame(f);
    }
    el._raf = requestAnimationFrame(f);
  }

  /* ---------- 단계 적용 ---------- */
  function apply(s, k, instant) {
    var sl = slides[s];
    Array.prototype.forEach.call(sl.querySelectorAll('.a'), function (el) {
      var need = el.hasAttribute('data-step') ? +el.getAttribute('data-step') : 0;
      var out = el.hasAttribute('data-out') ? +el.getAttribute('data-out') : 1e9;
      var eff = STEP_MODE ? k : 9999;
      var on = eff >= need && eff < out;
      var was = el.classList.contains('on');
      if (on && !was) {
        el.classList.add('on');
        Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), function (c) { runCount(c, instant); });
        if (el.hasAttribute('data-count')) runCount(el, instant);
      } else if (!on && was) {
        el.classList.remove('on');
      }
    });
  }

  /* ---------- 상단 표시 ---------- */
  function chrome() {
    var sl = slides[cur];
    secEl.textContent = sl.getAttribute('data-sec') || '';
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var html = pad(cur + 1) + ' / ' + pad(N);
    if (maxStep[cur] > 0) {
      html += '<span class="pips">';
      for (var i = 1; i <= maxStep[cur]; i++) html += '<i class="' + (i <= step ? 'd' : '') + '"></i>';
      html += '</span>';
    }
    cntEl.innerHTML = html;
    navN.textContent = pad(cur + 1) + ' / ' + pad(N);
    for (var j = 0; j < N; j++) segs[j].className = j <= cur ? 'd' : '';
    var dark = sl.classList.contains('dark');
    stage.classList.toggle('dark', dark);
    stage.classList.toggle('nochrome', sl.hasAttribute('data-nochrome'));
    document.body.classList.toggle('dark-bg', dark);
    renderNotes();
  }

  /* ---------- 이동 ---------- */
  function go(s, k, opts) {
    opts = opts || {};
    s = Math.max(0, Math.min(N - 1, s));
    k = Math.max(0, Math.min(maxStep[s], k));
    var still = document.body.classList.contains('still');
    var instant = !!opts.instant || still;
    var sl = slides[s];

    if (s !== cur) {
      if (cur >= 0) slides[cur].classList.remove('active');
      sl.classList.add('inst');
      Array.prototype.forEach.call(sl.querySelectorAll('.a'), function (e) { e.classList.remove('on'); });
      Array.prototype.forEach.call(sl.querySelectorAll('[data-count]'), resetCount);
      void sl.offsetWidth;
      cur = s;
      step = k;
      sl.classList.add('active');
      var tys = sl.querySelectorAll('.ty');
      Array.prototype.forEach.call(tys, function (el) { typeIn(el, instant); });
      if (instant) {
        apply(s, k, true);
        requestAnimationFrame(function () { requestAnimationFrame(function () { sl.classList.remove('inst'); }); });
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            sl.classList.remove('inst');
            if (cur === s) apply(s, step, false);
          });
        });
      }
    } else {
      step = k;
      apply(s, k, instant);
    }
    chrome();
  }

  function startTimer() {
    if (t0 !== null) return;
    t0 = Date.now();
    timerId = setInterval(updTimer, 500);
    updTimer();
  }
  function updTimer() {
    if (t0 === null) { timerEl.textContent = '0:00 / 4:30'; return; }
    var sec = Math.floor((Date.now() - t0) / 1000);
    var mm = Math.floor(sec / 60), ss = sec % 60;
    timerEl.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss + ' / 4:30';
    timerEl.className = (timerEl.classList.contains('show') ? 'show ' : '') + (sec >= 300 ? 'over' : sec >= TARGET ? 'warn' : '');
  }

  function next() {
    if (cur === 0 && step === 0) startTimer();
    if (step < maxStep[cur]) go(cur, step + 1);
    else if (cur < N - 1) go(cur + 1, 0);
  }
  function prev() {
    if (step > 0) go(cur, step - 1);
    else if (cur > 0) go(cur - 1, maxStep[cur - 1], { instant: true });
  }

  /* ---------- 발표자 노트 ---------- */
  var cumul = [];
  (function () {
    var acc = 0;
    slides.forEach(function (s, i) {
      cumul[i] = acc;
      acc += +(s.getAttribute('data-time') || 0);
    });
    cumul.total = acc;
  })();
  function fmtT(sec) { return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
  function renderNotes() {
    var sl = slides[cur];
    var n = sl.querySelector('.notes');
    var tm = +(sl.getAttribute('data-time') || 0);
    notesEl.innerHTML = '<div class="nh">SLIDE ' + (cur + 1) + ' / ' + N + ' &nbsp;·&nbsp; 이 장 ' + tm + '초 &nbsp;·&nbsp; 누적 ' + fmtT(cumul[cur]) + ' → ' + fmtT(cumul[cur] + tm) + ' (전체 ' + fmtT(cumul.total) + ')</div><div class="nt">' + (n ? n.innerHTML : '') + '</div>';
  }

  /* ---------- 입력 ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter' || k === 'ArrowDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace' || k === 'ArrowUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0, 0, { instant: true }); }
    else if (k === 'End') { e.preventDefault(); go(N - 1, 0, { instant: true }); }
    else if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    }
    else if (k === 't' || k === 'T') { timerEl.classList.toggle('show'); updTimer(); }
    else if (k === 'r' || k === 'R') { t0 = null; clearInterval(timerId); updTimer(); }
    else if (k === 'n' || k === 'N') { notesEl.classList.toggle('show'); }
    else if (k === 'h' || k === 'H' || k === '?') { helpEl.classList.toggle('show'); }
    else if (k === 'Escape') { helpEl.classList.remove('show'); notesEl.classList.remove('show'); }
  });
  stage.addEventListener('click', function (e) {
    if (helpEl.classList.contains('show')) { helpEl.classList.remove('show'); return; }
    next();
  });
  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); prev(); });

  /* ---------- 이동 버튼 (마우스를 움직이면 잠깐 나타남) ---------- */
  var navTimer = null;
  function showNav() {
    if (document.body.classList.contains('still')) return;
    navEl.classList.add('show');
    clearTimeout(navTimer);
    navTimer = setTimeout(function () { navEl.classList.remove('show'); }, 2600);
  }
  window.addEventListener('mousemove', showNav);
  navEl.addEventListener('mouseenter', function () { clearTimeout(navTimer); });
  navEl.addEventListener('mouseleave', showNav);
  document.getElementById('btn-prev').addEventListener('click', function (e) { e.stopPropagation(); prev(); showNav(); });
  document.getElementById('btn-next').addEventListener('click', function (e) { e.stopPropagation(); next(); showNav(); });
  document.getElementById('zone-prev').addEventListener('click', function (e) { e.stopPropagation(); prev(); showNav(); });
  var tx = null;
  window.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    tx = null;
  }, { passive: true });

  /* ---------- 시작 ---------- */
  var q = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[kv[0]] = kv[1]; });
  var hashN = parseInt(location.hash.replace('#', ''), 10);
  if (q.still) document.body.classList.add('still');
  var s0 = q.s ? parseInt(q.s, 10) - 1 : (hashN ? hashN - 1 : 0);
  var k0 = q.k ? parseInt(q.k, 10) : 0;
  updTimer();

  function boot() { go(s0, k0, { instant: !!q.still || k0 > 0 }); showNav(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();

  window.__deck = { next: next, prev: prev, go: go, count: N, maxStep: maxStep };
})();
