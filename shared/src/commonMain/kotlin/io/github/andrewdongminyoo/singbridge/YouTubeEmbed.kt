package io.github.andrewdongminyoo.singbridge

fun youtubeEmbedHtml(appId: String): String {
    require(Regex("[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+").matches(appId))
    return """
        <!doctype html>
        <html lang="ko">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="referrer" content="strict-origin-when-cross-origin">
        <style>
        body { margin: 0; background: #faf7f0; color: #263b35; font: 16px system-ui; }
        main { max-width: 720px; margin: auto; padding: 16px; }
        label, input { display: block; }
        input { box-sizing: border-box; width: 100%; padding: 12px; margin: 8px 0; font-size: 16px; }
        button { padding: 12px 16px; margin: 4px 4px 4px 0; font: inherit; }
        #viewport { min-width: 200px; height: max(220px, 56vw); max-height: 405px; margin: 16px 0; position: sticky; top: 0; z-index: 1; background: #000; }
        #player, iframe { width: 100%; height: 100%; border: 0; }
        #status { min-height: 3em; }
        section { overflow-wrap: anywhere; }
        #lyrics-results button { display: block; width: 100%; text-align: left; }
        .lyric-current { font-size: 1.4rem; font-weight: 700; min-height: 3em; white-space: pre-wrap; }
        .lyric-context, .lyric-plain { white-space: pre-wrap; }
        .lyric-context { color: #596d65; min-height: 1.5em; }
        </style>
        </head>
        <body><main>
        <h1>YouTube 재생</h1>
        <p>YouTube 영상을 연 뒤, 아래에서 가사를 검색해 함께 연습해 보세요.</p>
        <form id="open">
        <label for="video-url">YouTube 영상 링크 또는 ID</label>
        <input id="video-url" type="text" inputmode="url" autocapitalize="none" autocomplete="off"
          spellcheck="false" placeholder="https://youtu.be/…" maxlength="2048">
        <button type="submit">영상 열기</button>
        </form>
        <p id="status" role="status" aria-live="polite">YouTube를 준비하고 있어요…</p>
        <div id="viewport"><div id="player"></div></div>
        <p id="position">0:00 / 0:00</p>
        <button id="back" disabled>5초 뒤로</button><button id="forward" disabled>5초 앞으로</button>
        <p>화면을 벗어나거나 영상이 가려지면 재생을 멈춰요. 다른 영상으로 바꾸려면 위에 새 링크를 넣어 주세요.</p>
        __LYRICS__
        </main>
        <script>
        const input = document.getElementById('video-url');
        const status = document.getElementById('status');
        const position = document.getElementById('position');
        const back = document.getElementById('back');
        const forward = document.getElementById('forward');
        let player = null, ready = false, apiReady = false, foreground = true, visible = false, generation = 0;
        function videoId(value) {
          const text = value.trim();
          const valid = /^[A-Za-z0-9_-]{11}$/;
          if (valid.test(text)) return text;
          try {
            const url = new URL(text);
            if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
            let id = null;
            if (url.hostname === 'youtu.be') {
              if (/^\/[A-Za-z0-9_-]{11}$/.test(url.pathname)) id = url.pathname.slice(1);
            } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
              if (url.pathname === '/watch') id = url.searchParams.get('v');
              else {
                const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})$/);
                if (match) id = match[1];
              }
            }
            return id && valid.test(id) ? id : null;
          } catch (_) { return null; }
        }
        function controls(enabled) { back.disabled = forward.disabled = !enabled; }
        function pause() { if (player && typeof player.pauseVideo === 'function') player.pauseVideo(); }
        function canPlay() { return foreground && !document.hidden && visible; }
        window.singBridgePause = function() { foreground = false; pause(); };
        window.singBridgeResume = function() { foreground = true; };
        document.addEventListener('visibilitychange', function() { if (document.hidden) pause(); });
        new IntersectionObserver(function(entries) {
          visible = entries[0].intersectionRatio >= 0.5;
          if (!visible) pause();
        }, { threshold: [0, 0.5, 1] }).observe(document.getElementById('viewport'));
        window.onYouTubeIframeAPIReady = function() {
          apiReady = true;
          status.textContent = '영상 링크를 입력해 주세요.';
        };
        setTimeout(function() {
          if (!apiReady) status.textContent = 'YouTube에 연결하지 못했어요. 인터넷 연결을 확인하고 화면을 다시 열어 주세요.';
        }, 15000);
        document.getElementById('open').addEventListener('submit', function(event) {
          event.preventDefault();
          const id = videoId(input.value);
          if (!id) { status.textContent = '올바른 YouTube 영상 링크나 11자리 ID를 입력해 주세요.'; return; }
          if (!apiReady) { status.textContent = 'YouTube 연결을 기다리고 있어요. 잠시 후 다시 시도해 주세요.'; return; }
          const current = ++generation;
          let settled = false;
          ready = false; controls(false);
          resetLyrics();
          if (player) player.destroy();
          player = null;
          const target = document.createElement('div'); target.id = 'player';
          document.getElementById('viewport').replaceChildren(target);
          position.textContent = '0:00 / 0:00';
          status.textContent = '영상을 준비하고 있어요…';
          player = new YT.Player('player', {
            videoId: id, width: '100%', height: '100%',
            playerVars: { autoplay: 0, controls: 1, playsinline: 1, fs: 0, origin: '__APP_ORIGIN__', rel: 0 },
            events: {
              onReady: function() {
                if (current !== generation) return;
                settled = true; ready = true; controls(true);
                status.textContent = 'YouTube 플레이어의 재생 버튼을 눌러 주세요.';
                if (!canPlay()) pause();
              },
              onStateChange: function(event) {
                if (current !== generation) return;
                if (event.data === 1 && !canPlay()) { pause(); return; }
                const messages = { '0': '재생이 끝났어요.', '1': '재생 중', '2': '일시정지', '3': '영상을 불러오는 중…' };
                if (messages[event.data]) status.textContent = messages[event.data];
              },
              onError: function(event) {
                if (current !== generation) return;
                settled = true; ready = false; controls(false);
                status.textContent = event.data === 153
                  ? 'YouTube가 앱 연결을 확인하지 못했어요. 화면을 닫고 다시 시도해 주세요. (153)'
                  : '이 영상을 여기서 재생할 수 없어요. 다른 영상 링크를 선택해 주세요. (' + event.data + ')';
              }
            }
          });
          setTimeout(function() {
            if (current === generation && !settled) status.textContent = '영상을 준비하지 못했어요. 연결을 확인하거나 다른 영상 링크를 선택해 주세요.';
          }, 15000);
        });
        function time(seconds) {
          const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
          return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
        }
        function seek(delta) {
          if (!ready || !canPlay()) return;
          const duration = player.getDuration(), current = player.getCurrentTime();
          if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(current)) return;
          player.seekTo(Math.max(0, Math.min(duration, current + delta)), true);
        }
        back.addEventListener('click', function() { seek(-5); });
        forward.addEventListener('click', function() { seek(5); });
        setInterval(function() {
          refreshLyrics();
          if (!ready) return;
          position.textContent = time(player.getCurrentTime()) + ' / ' + time(player.getDuration());
        }, 500);
        </script>
        <script src="https://www.youtube.com/iframe_api"></script>
        </body></html>
    """.trimIndent().replace("__APP_ORIGIN__", "https://$appId").replace("__LYRICS__", youtubeLyricsHtml())
}
