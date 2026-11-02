/* ==========================================================================
   생각의 방 — 포스터 확대 이동 (외부 라이브러리 없음)

   구역(1~6)을 클릭하거나 숫자 키를 누르면 그 구역으로 확대된다.
     1~6        해당 구역으로 확대
     → Space    다음 구역 (전체 보기에서는 1번으로)
     ←          이전 구역 (1번에서는 전체 보기로)
     0 Esc Home 전체 보기
     F          전체 화면
   인쇄(PDF)할 때는 이 장치가 모두 꺼지고 A0 크기로 출력된다.
   ========================================================================== */
(function () {
  'use strict';
  var W = 2100, H = 2969;
  var stage = document.getElementById('stage');
  var secs = Array.prototype.slice.call(document.querySelectorAll('.sec'));
  var dock = document.getElementById('dock');
  var btns = Array.prototype.slice.call(dock.querySelectorAll('button'));
  var cur = -1;
  var dockTimer = null;
  var still = /[?&]still\b/.test(location.search);
  if (still) document.body.classList.add('still');

  function setT(x, y, k) {
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')';
  }
  function overview() {
    var k = Math.min(window.innerWidth / W, window.innerHeight / H);
    setT((window.innerWidth - W * k) / 2, (window.innerHeight - H * k) / 2, k);
    cur = -1;
    mark();
  }
  function zoom(i) {
    i = Math.max(0, Math.min(secs.length - 1, i));
    var s = secs[i];
    var w = s.offsetWidth, h = s.offsetHeight;
    var k = Math.min(window.innerWidth * 0.95 / w, window.innerHeight * 0.95 / h);
    setT(window.innerWidth / 2 - (s.offsetLeft + w / 2) * k, window.innerHeight / 2 - (s.offsetTop + h / 2) * k, k);
    cur = i;
    mark();
  }
  function mark() {
    document.body.classList.toggle('zoomed', cur >= 0);
    secs.forEach(function (s, n) { s.classList.toggle('dim', cur >= 0 && n !== cur); });
    btns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-go') === cur + 1); });
  }
  function showDock() {
    if (still) return;
    dock.classList.add('show');
    clearTimeout(dockTimer);
    dockTimer = setTimeout(function () { dock.classList.remove('show'); }, 3200);
  }

  stage.classList.add('nt');
  overview();
  requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.remove('nt'); }); });

  window.addEventListener('resize', function () {
    stage.classList.add('nt');
    if (cur >= 0) zoom(cur); else overview();
    requestAnimationFrame(function () { stage.classList.remove('nt'); });
  });

  secs.forEach(function (s, i) {
    s.addEventListener('click', function (e) {
      if (cur === -1) zoom(i); else overview();
      showDock();
    });
  });
  btns.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var n = +b.getAttribute('data-go');
      if (n === 0) overview(); else zoom(n - 1);
      showDock();
    });
  });
  dock.addEventListener('mouseenter', function () { clearTimeout(dockTimer); });
  dock.addEventListener('mouseleave', showDock);
  window.addEventListener('mousemove', showDock);

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k >= '1' && k <= '6') { zoom(+k - 1); }
    else if (k === '0' || k === 'Escape' || k === 'Home') { overview(); }
    else if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'PageDown' || k === 'ArrowDown') { e.preventDefault(); zoom(cur + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace' || k === 'ArrowUp') { e.preventDefault(); if (cur <= 0) overview(); else zoom(cur - 1); }
    else if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    } else return;
    showDock();
  });

  var q = location.search.match(/[?&]z=(\d)/);
  if (q) { stage.classList.add('nt'); (+q[1] === 0) ? overview() : zoom(+q[1] - 1); }
  showDock();
  window.__poster = { zoom: zoom, overview: overview };
})();
