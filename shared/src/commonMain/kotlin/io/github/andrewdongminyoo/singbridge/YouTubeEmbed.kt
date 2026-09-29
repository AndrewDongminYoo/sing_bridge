package io.github.andrewdongminyoo.singbridge

fun youtubeEmbedHtml(appId: String): String = buildYoutubeEmbedHtml(appId, youtubeDataApiKey)

internal fun buildYoutubeEmbedHtml(appId: String, apiKey: String): String {
    require(apiKey.isEmpty() || Regex("[A-Za-z0-9_-]{1,200}").matches(apiKey))
    require(Regex("[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+").matches(appId))
    return """
        <!doctype html>
        <html lang="ko">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="referrer" content="strict-origin-when-cross-origin">
        <style>
        :root { --control-ink: #263b35; --control-muted: #596d65; --control-border: #c6d0c9; --control-surface: #fff; --control-tint: #edf2ee; --control-focus: #235e52; }
        * { box-sizing: border-box; }
        [hidden] { display: none !important; }
        body { margin: 0; background: #faf7f0; color: #263b35; font: 16px system-ui; }
        main { max-width: 720px; margin: auto; padding: 16px; }
        label, input { display: block; }
        input { width: 100%; padding: 12px; margin: 8px 0; font: inherit; }
        input:not([type="checkbox"]) { min-height: 48px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--control-surface); color: var(--control-ink); }
        button { appearance: none; -webkit-appearance: none; min-height: 44px; padding: 10px 14px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--control-surface); color: var(--control-ink); font: 600 0.9375rem/1.3 system-ui; cursor: pointer; touch-action: manipulation; }
        button:not(:disabled):active { background: var(--control-tint); box-shadow: inset 0 0 0 1px var(--control-border); }
        button:disabled { background: transparent; color: var(--control-muted); opacity: 0.55; cursor: default; }
        .button-primary:not(:disabled) { background: var(--control-ink); color: #faf7f0; border-color: var(--control-ink); }
        .button-primary:not(:disabled):active { background: var(--control-focus); border-color: var(--control-focus); box-shadow: none; }
        button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--control-focus); outline-offset: 3px; }
        input[type="checkbox"] { accent-color: var(--control-ink); }
        #lyrics-panel-close, #find-another-song { background: transparent; }
        #lyrics-panel-open { background: var(--control-tint); }
        #return-to-practice { margin-top: 12px; }
        section { overflow-wrap: anywhere; }
        .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        #practice-screen { position: fixed; inset: 0; width: 100%; height: 100dvh; max-width: 720px; margin: auto; padding: 12px; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto clamp(200px, 30dvh, 300px) auto minmax(0, 1fr); gap: 8px; }
        .practice-header { min-width: 0; }
        .practice-toolbar { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .practice-toolbar button { flex-shrink: 0; }
        #song-result { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
        .player-alert { margin: 4px 0 0; max-height: 5em; overflow-y: auto; }
        #viewport { min-width: 200px; min-height: 200px; background: #000; }
        #player, iframe { display: block; width: 100%; height: 100%; border: 0; }
        .playback-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        #position { margin: 0; font-variant-numeric: tabular-nums; }
        .repeat-option { display: flex; align-items: center; gap: 6px; min-height: 32px; }
        #repeat-song { width: 20px; height: 20px; padding: 0; margin: 0; }
        #lyric-workspace { min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; gap: 8px; }
        #lyric-window { position: relative; min-height: 0; overflow-y: auto; overscroll-behavior: contain; overflow-anchor: none; text-align: left; }
        #lyrics-timing { padding-inline: 12px; }
        .lyric-row, .lyric-plain { white-space: pre-wrap; margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
        .lyric-row { min-height: 1.5em; padding-block: 14px; font-size: 1.35rem; font-weight: 700; color: #596d65; opacity: 0.8; transition: color 240ms ease, opacity 240ms ease; }
        button.lyric-row { display: block; width: 100%; padding-inline: 0; border: 0; border-radius: 6px; background: transparent; text-align: inherit; font-family: inherit; }
        button.lyric-row:focus-visible { outline-offset: -2px; }
        button.lyric-row:not(:disabled):active { background: var(--control-tint); box-shadow: none; }
        .pronunciation-layer { display: block; margin-top: 6px; font-size: 1rem; font-weight: 500; color: #235e52; }
        .pronunciation-languages { display: block; margin-top: 4px; font-size: 0.6875rem; font-weight: 400; }
        .pronunciation-review { text-decoration: underline dotted; text-underline-offset: 4px; }
        #pronunciation-target, #pronunciation-edit-line, #pronunciation-edit-text { min-height: 44px; padding: 8px; font: inherit; color: inherit; background: #fff; border: 1px solid var(--control-border); border-radius: 10px; }
        #pronunciation-editor { margin-top: 12px; }
        #pronunciation-edit-line, #pronunciation-edit-text { display: block; width: 100%; margin-block: 8px; }
        #pronunciation-edit-text { resize: vertical; }
        .lyric-row.is-current { color: #263b35; opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .lyric-row { transition: none; } }
        .lyric-plain:empty { display: none; }
        #lyrics-placeholder { margin: 12px 0; color: #596d65; }
        .lyric-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.875rem; }
        .lyric-meta a { color: #235e52; }
        #lyrics-offset-value { margin: 0; font-variant-numeric: tabular-nums; }
        .practice-controls { display: grid; gap: 8px; padding-top: 8px; border-top: 1px solid var(--control-border); }
        .control-row { display: grid; grid-template-columns: 36px minmax(0, 1fr); align-items: center; gap: 8px; }
        .control-caption { color: var(--control-muted); font-size: 0.6875rem; font-weight: 600; line-height: 1.4; }
        .transport-controls, .sync-controls { display: grid; gap: 6px; }
        .transport-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sync-controls { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        #lyrics-sync { border-top: 1px solid var(--control-border); }
        #lyrics-sync summary { min-height: 44px; padding: 12px 4px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
        #lyrics-sync p { margin: 0 0 8px; color: var(--control-muted); font-size: 0.75rem; }
        .practice-controls button { min-width: 0; padding: 8px 4px; font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
        .transport-controls button { background: var(--control-tint); }
        .practice-controls button:disabled { background: transparent; }
        #lyrics-panel { width: min(560px, calc(100% - 24px)); max-height: calc(100dvh - 24px); padding: 16px; border: 1px solid #c6d0c9; border-radius: 16px; background: #faf7f0; color: #263b35; overflow-y: auto; overscroll-behavior: contain; }
        #lyrics-panel::backdrop { background: rgb(0 0 0 / 45%); }
        .panel-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: -16px; padding: 8px 0; background: #faf7f0; }
        .panel-toolbar h2 { margin: 0; font-size: 1.2rem; }
        #lyrics-results button { display: block; width: 100%; margin: 10px 0; padding: 14px; text-align: left; background: #fff; border: 1px solid #c6d0c9; border-radius: 12px; line-height: 1.45; font-weight: 400; }
        #lyrics-results button:focus-visible { outline: 2px solid #235e52; outline-offset: 2px; }
        #lyrics-results button:disabled { opacity: 0.6; }
        .candidate-title { display: block; font-size: 1.05rem; font-weight: 700; overflow-wrap: anywhere; }
        .candidate-detail { display: block; margin-top: 3px; color: #596d65; font-size: 0.8rem; overflow-wrap: anywhere; }
        .candidate-badges { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 6px; }
        .candidate-badge { padding: 2px 8px; border-radius: 6px; background: #263b35; color: #faf7f0; font-size: 0.75rem; font-weight: 600; }
        .candidate-type { background: #faf7f0; color: #263b35; border: 1px solid #c6d0c9; }
        .candidate-duration { font-variant-numeric: tabular-nums; }
        .candidate-preview { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 10px; padding-top: 9px; border-top: 1px solid #c6d0c9; color: #596d65; font-size: 0.9rem; overflow-wrap: anywhere; }
        .saved-practice { display: flex; gap: 8px; margin: 8px 0; }
        .saved-practice button:first-child { flex: 1; min-width: 0; text-align: left; overflow-wrap: anywhere; }
        #lyrics-panel p { overflow-wrap: anywhere; }
        #video-details, #lyrics-source { font-size: 0.875rem; }
        @media (min-width: 600px) and (max-height: 480px) {
          #practice-screen { max-width: none; grid-template-columns: minmax(200px, 1fr) minmax(0, 1fr); grid-template-rows: auto minmax(200px, 1fr) auto; }
          .practice-header { grid-column: 1 / -1; }
          #viewport { grid-column: 1; grid-row: 2; }
          .playback-meta { grid-column: 1; grid-row: 3; }
          #lyric-workspace { grid-column: 2; grid-row: 2 / 4; }
        }
        </style>
        </head>
        <body><main>
        <section id="discovery-screen" aria-labelledby="discovery-heading">
        <h1 id="discovery-heading" tabindex="-1">노래 찾기</h1>
        <p>가수와 제목으로 노래를 찾거나 영상 링크를 입력해 주세요.</p>
        __SEARCH__
        <form id="open">
        <label for="video-url">YouTube 영상 링크 또는 ID</label>
        <input id="video-url" type="text" inputmode="url" autocapitalize="none" autocomplete="off" autocorrect="off"
          spellcheck="false" placeholder="https://youtu.be/…" maxlength="2048">
        <button class="button-primary" type="submit">영상 열기</button>
        </form>
        <div id="saved-library"></div>
        <button id="return-to-practice" type="button" hidden>연습으로 돌아가기</button>
        </section>
        <section id="practice-screen" aria-labelledby="practice-heading" hidden>
        <header class="practice-header">
        <h1 id="practice-heading" class="visually-hidden" tabindex="-1">노래 연습</h1>
        <div class="practice-toolbar">
        <button id="find-another-song" type="button">곡 찾기</button>
        <p id="song-result"></p>
        </div>
        <p id="status" class="visually-hidden" role="status" aria-live="polite">YouTube를 준비하고 있어요…</p>
        </header>
        <div id="viewport"><div id="player"></div></div>
        <div class="playback-meta">
        <p id="position">0:00 / 0:00</p>
        <label class="repeat-option"><input id="repeat-song" type="checkbox" checked>한 곡 반복</label>
        </div>
        __LYRICS__
        </section>
        </main>
        __LIBRARY__
        <script>
        const input = document.getElementById('video-url');
        const songResult = document.getElementById('song-result');
        const repeatSong = document.getElementById('repeat-song');
        const status = document.getElementById('status');
        const position = document.getElementById('position');
        const back = document.getElementById('back');
        const forward = document.getElementById('forward');
        const discoveryScreen = document.getElementById('discovery-screen');
        const practiceScreen = document.getElementById('practice-screen');
        const returnToPractice = document.getElementById('return-to-practice');
        let activeVideoId = null;
        let pendingRecovery = null;
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
        function playerStatus(message, prominent = false) {
          status.textContent = message;
          status.className = prominent ? 'player-alert' : 'visually-hidden';
        }
        function controls(enabled) { back.disabled = forward.disabled = !enabled; }
        function pause() { if (player && typeof player.pauseVideo === 'function') player.pauseVideo(); }
        function canPlay() { return foreground && !document.hidden && !practiceScreen.hidden && !lyricsPanel.open && visible; }
        function showPractice() {
          if (!songResult.textContent) songResult.textContent = '노래 연습';
          discoveryScreen.hidden = true; practiceScreen.hidden = false;
          returnToPractice.hidden = false;
          window.scrollTo?.(0, 0);
          document.getElementById('practice-heading').focus?.();
        }
        document.getElementById('find-another-song').addEventListener('click', function() {
          pause(); visible = false;
          practiceScreen.hidden = true; discoveryScreen.hidden = false;
          window.scrollTo?.(0, 0);
          document.getElementById('discovery-heading').focus?.();
        });
        returnToPractice.addEventListener('click', function() {
          if (songRequest) cancelSongSearch();
          showPractice();
        });
        repeatSong.addEventListener('change', function() { if (ready && player) player.setLoop(repeatSong.checked); });
        window.singBridgePause = function() { foreground = false; pause(); };
        window.singBridgeResume = function() { foreground = true; };
        document.addEventListener('visibilitychange', function() { if (document.hidden) pause(); });
        new IntersectionObserver(function(entries) {
          visible = entries[0].intersectionRatio >= 0.5;
          if (!visible) pause();
        }, { threshold: [0, 0.5, 1] }).observe(document.getElementById('viewport'));
        window.onYouTubeIframeAPIReady = function() {
          apiReady = true;
          playerStatus('노래를 검색하거나 영상 링크를 입력해 주세요.');
        };
        setTimeout(function() {
          if (!apiReady) songStatus.textContent = 'YouTube에 연결하지 못했어요. 인터넷 연결을 확인하고 화면을 다시 열어 주세요.';
        }, 15000);
        document.getElementById('open').addEventListener('submit', function(event) {
          event.preventDefault();
          const id = videoId(input.value);
          if (!id) { songStatus.textContent = '올바른 YouTube 영상 링크나 11자리 ID를 입력해 주세요.'; return; }
          if (!apiReady) { songStatus.textContent = 'YouTube 연결을 기다리고 있어요. 잠시 후 다시 시도해 주세요.'; return; }
          cancelSongSearch();
          openVideo(id);
        });
        function openVideo(id, lyricQuery = null, searchVersion = searchSequence, restoration = null, videoLabel = '노래 연습', saved = null) {
          if (lyricQuery && !pendingRecovery && ready && activeVideoId) pendingRecovery = {
            id: activeVideoId, record: selectedLyricRecord, adjustment: lyricAdjustment,
            query: lyricsQuery.value, position: player.getCurrentTime(), label: songResult.textContent
          };
          if (!lyricQuery) pendingRecovery = restoration;
          let fallback = lyricQuery ? pendingRecovery : null;
          songResult.textContent = restoration ? restoration.label : videoLabel;
          if (!restoration || !practiceScreen.hidden) showPractice();
          const current = ++generation;
          let settled = false, lyricsStarted = false;
          ready = false; activeVideoId = id; controls(false);
          resetLyrics();
          if (player) player.destroy();
          player = null;
          const target = document.createElement('div'); target.id = 'player';
          document.getElementById('viewport').replaceChildren(target);
          position.textContent = '0:00 / 0:00';
          playerStatus('영상을 준비하고 있어요…');
          player = new YT.Player('player', {
            videoId: id, width: '100%', height: '100%',
            playerVars: { loop: repeatSong.checked ? 1 : 0, playlist: id, start: restoration && Number.isFinite(restoration.position) ? Math.max(0, Math.floor(restoration.position)) : 0, autoplay: 0, controls: 1, playsinline: 1, fs: 0, origin: '__APP_ORIGIN__', rel: 0 },
            events: {
              onReady: function() {
                if (current !== generation) return;
                settled = true; ready = true; controls(true);
                player.setLoop(repeatSong.checked);
                playerStatus('YouTube 플레이어의 재생 버튼을 눌러 주세요.');
                if (!canPlay()) pause();
                if (restoration) {
                  pendingRecovery = null;
                  lyricsQuery.value = restoration.query;
                  if (restoration.record) {
                    chooseLyrics(restoration.record, current);
                    lyricAdjustment = restoration.adjustment;
                    lyricsOffset.value = String(lyricAdjustment); refreshLyrics();
                  }
                }
                if (saved && !lyricsStarted) {
                  lyricsStarted = true;
                  lyricFinished = lyricFinished.then(function() {
                    if (current !== generation || searchVersion !== searchSequence || !ready) return;
                    return searchLyrics('', saved);
                  });
                }
                if (lyricQuery && !lyricsStarted) {
                  lyricsStarted = true;
                  lyricFinished.then(function() {
                    if (current !== generation || searchVersion !== searchSequence || !ready) return;
                    lyricsQuery.value = lyricQuery;
                    return startLyricSearch(lyricQuery);
                  });
                }
              },
              onStateChange: function(event) {
                if (current !== generation) return;
                if (event.data === 1) { fallback = null; pendingRecovery = null; }
                if (event.data === 1 && !canPlay()) { pause(); return; }
                const messages = { '0': repeatSong.checked ? '같은 곡을 다시 재생해요.' : '재생이 끝났어요.', '1': '재생 중', '2': '일시정지', '3': '영상을 불러오는 중…' };
                if (messages[event.data]) playerStatus(messages[event.data]);
              },
              onError: function(event) {
                if (current !== generation) return;
                settled = true; ready = false; controls(false);
                if (restorePrevious()) return;
                playerStatus(event.data === 153
                  ? 'YouTube가 앱 연결을 확인하지 못했어요. 화면을 닫고 다시 시도해 주세요. (153)'
                  : '이 영상을 여기서 재생할 수 없어요. 다른 영상 링크를 선택해 주세요. (' + event.data + ')', true);
              }
            }
          });
          function restorePrevious() {
            if (!fallback) return false;
            const previous = fallback; fallback = null;
            songStatus.textContent = '검색한 영상을 재생할 수 없어 이전 영상으로 돌아왔어요. 다른 검색어나 링크를 입력해 주세요.';
            input.value = 'https://www.youtube.com/watch?v=' + previous.id;
            openVideo(previous.id, null, searchVersion, previous);
            return true;
          }
          setTimeout(function() {
            if (current === generation && !settled && !restorePrevious()) playerStatus('영상을 준비하지 못했어요. 연결을 확인하거나 다른 영상 링크를 선택해 주세요.', true);
          }, 15000);
        }
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
        }, 250);
        </script>
        <script src="https://www.youtube.com/iframe_api"></script>
        </body></html>
    """.trimIndent().replace("__APP_ORIGIN__", "https://$appId")
        .replace("__SEARCH__", youtubeSearchHtml())
        .replace("__LYRICS__", youtubeLyricsHtml())
        .replace("__PRONUNCIATION__", youtubePronunciationHtml())
        .replace("__LIBRARY__", youtubeLibraryHtml())
        .replace("__YOUTUBE_API_KEY__", apiKey)
}
