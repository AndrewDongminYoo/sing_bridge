package io.github.andrewdongminyoo.singbridge

internal fun youtubeLyricsHtml(): String = """
    <section id="lyric-workspace" aria-label="가사 연습">
    <div id="lyric-window" tabindex="0" aria-label="가사">
    <p id="lyrics-placeholder">가사를 선택해 연습을 시작하세요.</p>
    <div id="lyrics-timing" role="group" aria-label="시간에 맞춘 가사" hidden></div>
    <p id="lyrics-plain" class="lyric-plain"></p>
    </div>
    <div class="lyric-meta">
    <a href="https://lrclib.net" aria-label="가사 제공: LRCLIB">LRCLIB</a>
    <p id="lyrics-offset-value" role="status" aria-live="polite" aria-label="가사 시간 조정">원래 시간</p>
    <button id="lyrics-panel-open" type="button">가사·설정</button>
    </div>
    <footer class="practice-controls" aria-label="연습 조작">
    <div class="control-row" role="group" aria-labelledby="transport-caption">
    <span id="transport-caption" class="control-caption">재생<br>이동</span>
    <div class="transport-controls">
    <button id="back" type="button" disabled>5초 뒤로</button>
    <button id="forward" type="button" disabled>5초 앞으로</button>
    </div>
    </div>
    <details id="lyrics-sync">
    <summary>가사 싱크 조절</summary>
    <p>노래 위치는 그대로 두고 가사 표시 시점만 바꿔요.</p>
    <div class="sync-controls" role="group" aria-label="가사 표시 시점 조절">
    <button id="lyrics-earlier" type="button" disabled>0.5초 일찍</button>
    <button id="lyrics-later" type="button" disabled>0.5초 늦게</button>
    <button id="lyrics-reset" type="button" disabled>초기화</button>
    </div>
    </details>
    </footer>
    <dialog id="lyrics-panel" aria-labelledby="lyrics-panel-heading">
    <div class="panel-toolbar">
    <h2 id="lyrics-panel-heading">가사·설정</h2>
    <button id="lyrics-panel-close" type="button">닫기</button>
    </div>
    <p id="video-details"></p>
    <p id="lyrics-source"></p>
    <p id="lyrics-scripts"></p>
    <button id="save-practice" class="button-primary" type="button" disabled>이 연습 저장</button>
    <p id="save-status" role="status" aria-live="polite"></p>
    __PRONUNCIATION__
    <details id="lyrics-settings" open>
    <summary>노래 제목·가수로 가사 찾기</summary>
    <form id="lyrics-search">
    <label for="lyrics-query">노래 제목·가수</label>
    <input id="lyrics-query" type="search" maxlength="120" autocorrect="off" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="노래 제목과 가수를 입력해 주세요">
    <button id="lyrics-search-button" class="button-primary" type="submit">가사 검색</button>
    </form>
    <p>미리보기로 영상과 같은 곡·버전인지 확인해 주세요.</p>
    <p id="lyrics-ranking" role="status" aria-live="polite"></p>
    <div id="lyrics-results"></div>
    </details>
    <p id="lyrics-status" role="status" aria-live="polite">영상을 연 뒤 가사를 검색해 주세요.</p>
    <details><summary>시간 직접 입력</summary>
    <label for="lyrics-offset">가사 시간 조정 (초)</label>
    <input id="lyrics-offset" type="number" min="-600" max="600" step="0.1" value="0" disabled>
    <p>양수는 가사를 늦게, 음수는 일찍 보여 줍니다. ±600초까지 조정할 수 있어요.</p>
    </details>
    </dialog>
    </section>
    <script>
    const lyricsPanel = document.getElementById('lyrics-panel');
    document.getElementById('lyrics-panel-open').addEventListener('click', function() {
      pause();
      document.getElementById('video-details').textContent = document.getElementById('song-result').textContent;
      lyricsPanel.showModal();
    });
    document.getElementById('lyrics-panel-close').addEventListener('click', () => lyricsPanel.close());
    const lyricsQuery = document.getElementById('lyrics-query');
    const lyricsStatus = document.getElementById('lyrics-status');
    const lyricsResults = document.getElementById('lyrics-results');
    const lyricsButton = document.getElementById('lyrics-search-button');
    const lyricsOffset = document.getElementById('lyrics-offset');
    const lyricsEarlier = document.getElementById('lyrics-earlier');
    const lyricsLater = document.getElementById('lyrics-later');
    const lyricsReset = document.getElementById('lyrics-reset');
    const lyricWindow = document.getElementById('lyric-window');
    const lyricList = document.getElementById('lyrics-timing');
    let lyricRows = [], activeLyricIndex = -1, followDirty = true;
    let manualUntil = 0, lyricPointerDown = false;
    let lyricGesture = null;
    function suspendLyricFollow() { manualUntil = Date.now() + 4000; followDirty = true; }
    lyricWindow.addEventListener('wheel', suspendLyricFollow, { passive: true });
    lyricWindow.addEventListener('pointerdown', function(event = {}) {
      lyricGesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
        scrollTop: lyricWindow.scrollTop, cancelled: lyricPointerDown || event.isPrimary === false };
      lyricPointerDown = true; suspendLyricFollow();
      lyricWindow.scrollTo({ top: lyricWindow.scrollTop, behavior: 'instant' });
    });
    function releaseLyricPointer() {
      if (!lyricPointerDown) return;
      lyricPointerDown = false; suspendLyricFollow();
    }
    window.addEventListener('pointerup', releaseLyricPointer);
    window.addEventListener('pointermove', function(event) {
      if (lyricPointerDown && lyricGesture && event.pointerId === lyricGesture.id &&
          Math.hypot(event.clientX - lyricGesture.x, event.clientY - lyricGesture.y) > 8) lyricGesture.cancelled = true;
    });
    window.addEventListener('pointercancel', function() {
      if (lyricGesture) lyricGesture.cancelled = true;
      releaseLyricPointer();
    });
    lyricWindow.addEventListener('scroll', function() {
      if (lyricPointerDown && lyricGesture && Math.abs(lyricWindow.scrollTop - lyricGesture.scrollTop) > 4) lyricGesture.cancelled = true;
    }, { passive: true });
    lyricWindow.addEventListener('keydown', function(event) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) suspendLyricFollow();
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function() {
      followDirty = true;
    }).observe(lyricWindow);
    let lyricCandidates = [], rankedDuration = 0;
    let lyricLines = [], lyricAdjustment = 0, lyricRequest = null, lyricBusy = false, lyricRetryAt = 0;

    let lyricFinished = Promise.resolve(), selectedLyricRecord = null;

    function resetLyrics() {
      document.getElementById('lyrics-sync').open = false;
      if (lyricsPanel.open) lyricsPanel.close();
      document.getElementById('lyric-window').scrollTop = 0;
      if (lyricRequest) lyricRequest.abort();
      resetPronunciation();
      selectedLyricRecord = null; lyricLines = []; renderTimedLyrics(); updatePronunciationControl(); lyricAdjustment = 0; lyricsOffset.value = '0'; lyricsOffset.disabled = true;
      lyricCandidates = []; rankedDuration = 0;
      document.getElementById('lyrics-ranking').textContent = '';
      lyricsResults.replaceChildren();
      document.getElementById('lyrics-source').textContent = '';
      document.getElementById('lyrics-scripts').textContent = '';
      document.getElementById('save-status').textContent = '';
      document.getElementById('lyrics-plain').textContent = '';
      document.getElementById('lyrics-timing').hidden = true;
      document.getElementById('lyrics-settings').open = true;
      lyricsStatus.textContent = '영상과 같은 곡·버전의 가사를 검색해 주세요.';
      refreshLyrics();
    }

    function parseTimedLyrics(text) {
      if (new TextEncoder().encode(text).length > 1048576) throw new Error('가사가 너무 길어요. 다른 결과를 골라 주세요.');
      const entries = [];
      for (const source of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
        let line = source.trim();
        if (!line || /^\[(ar|al|ti|au|by|re|ve|length):.*]$/i.test(line) || /^\[offset:[+-]?0+]$/i.test(line)) continue;
        if (/^\[offset:/i.test(line)) throw new Error('offset 태그가 있는 가사는 아직 지원하지 않아요. 다른 결과를 골라 주세요.');
        const times = [];
        let match;
        while ((match = line.match(/^\[(\d{1,6}):([0-5]\d)(?:\.(\d{2,3}))?]/))) {
          times.push(Number(match[1]) * 60 + Number(match[2]) + Number((match[3] || '').padEnd(3, '0')) / 1000);
          if (entries.length + times.length > 10000) throw new Error('가사 시간표시가 너무 많아요.');
          line = line.slice(match[0].length);
        }
        line = line.trim();
        if (!times.length || line.startsWith('[') || /<\d+:\d+/.test(line)) throw new Error('지원하지 않는 가사 시간표시예요. 다른 결과를 골라 주세요.');
        for (const time of times) entries.push({ time, text: line });
      }
      entries.sort((a, b) => a.time - b.time);
      const groups = [];
      for (const entry of entries) {
        const last = groups[groups.length - 1];
        if (last && last.time === entry.time) {
          if (entry.text) last.text += (last.text ? '\n' : '') + entry.text;
        } else groups.push({ ...entry });
      }
      if (!groups.some(line => line.text)) throw new Error('시간표시가 있는 가사를 찾지 못했어요.');
      return groups;
    }

    function renderTimedLyrics() {
      lyricRows = []; activeLyricIndex = -1; followDirty = true;
      manualUntil = 0; lyricPointerDown = false; lyricGesture = null;
      lyricList.replaceChildren();
      for (let i = 0; i < lyricLines.length; i++) {
        const row = document.createElement(lyricLines[i].text ? 'button' : 'p');
        row.id = 'lyric-line-' + i; row.className = 'lyric-row';
        row.textContent = lyricLines[i].text;
        if (lyricLines[i].text) {
          row.type = 'button'; row.title = '이 구절부터 재생';
          row.addEventListener('click', function(event) {
            if (event.detail > 0 && lyricGesture?.cancelled) return;
            if (lyricRows[i] !== row || !ready || !canPlay() || !player) return;
            const duration = player.getDuration(), target = Math.max(0, lyricLines[i].time + lyricAdjustment);
            if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(target) || target >= duration) return;
            player.seekTo(target, true); player.playVideo();
            manualUntil = 0; lyricPointerDown = false; followDirty = true;
            refreshLyrics();
          });
        } else row.setAttribute('aria-hidden', 'true');
        lyricRows.push(row); lyricList.append(row);
      }
    }

    function followLyric(index) {
      if (activeLyricIndex !== index) {
        const previous = lyricRows[activeLyricIndex];
        if (previous) { previous.className = 'lyric-row'; previous.removeAttribute('aria-current'); }
        const current = lyricRows[index];
        if (current) { current.className = 'lyric-row is-current'; current.setAttribute('aria-current', 'true'); }
        activeLyricIndex = index; followDirty = true;
      }
      if (!followDirty || !lyricRows.length || lyricPointerDown || Date.now() < manualUntil ||
          !ready || practiceScreen.hidden || lyricsPanel.open || !foreground || document.hidden || lyricWindow.clientHeight <= 0) return;
      const height = lyricWindow.clientHeight;
      const inset = height / 2 + 'px';
      if (lyricList.style.paddingBlock !== inset) lyricList.style.paddingBlock = inset;
      const row = lyricRows[index >= 0 ? index : player.getCurrentTime() >= player.getDuration() ? lyricRows.length - 1 : 0];
      const top = Math.max(0, row.offsetTop - Math.max(0, (height - row.offsetHeight) / 2));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lyricWindow.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
      followDirty = false;
    }

    function refreshLyrics() {
      updateSaveControl();
      updateOffsetControls();
      const placeholder = document.getElementById('lyrics-placeholder');
      placeholder.hidden = !!selectedLyricRecord;
      const panelButton = document.getElementById('lyrics-panel-open');
      const panelLabel = selectedLyricRecord ? '가사·설정' : '가사 선택';
      if (panelButton.textContent !== panelLabel) panelButton.textContent = panelLabel;
      if (!selectedLyricRecord && placeholder.textContent !== lyricsStatus.textContent) placeholder.textContent = lyricsStatus.textContent;
      const duration = ready && player ? player.getDuration() : 0;
      if (lyricCandidates.length && Number.isFinite(duration) && duration > 0 && Math.round(duration) !== Math.round(rankedDuration) && !lyricsResults.contains?.(document.activeElement)) renderLyricCandidates(generation);
      let index = -1;
      if (ready && player && lyricLines.length) {
        const position = player.getCurrentTime(), duration = player.getDuration();
        if (Number.isFinite(position) && Number.isFinite(duration) && duration > 0 && position < duration) {
          const lyricTime = position - lyricAdjustment;
          let low = 0, high = lyricLines.length;
          while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (lyricLines[middle].time <= lyricTime) low = middle + 1;
            else high = middle;
          }
          index = low - 1;
        }
      }
      followLyric(index);
    }

    function updateOffsetControls() {
      const enabled = ready && lyricLines.length > 0;
      lyricsEarlier.disabled = !enabled || lyricAdjustment <= -600;
      lyricsLater.disabled = !enabled || lyricAdjustment >= 600;
      lyricsReset.disabled = !enabled || lyricAdjustment === 0;
      const text = lyricAdjustment === 0 ? '원래 시간' : Math.abs(lyricAdjustment) + (lyricAdjustment < 0 ? '초 일찍' : '초 늦게');
      const output = document.getElementById('lyrics-offset-value');
      if (output.textContent !== text) output.textContent = text;
    }

    function adjustLyrics(value) {
      if (!ready || !lyricLines.length) return;
      saveStatus.textContent = '';
      lyricAdjustment = Math.max(-600, Math.min(600, Number(value.toFixed(1))));
      lyricsOffset.value = String(lyricAdjustment); refreshLyrics();
    }
    lyricsEarlier.addEventListener('click', () => adjustLyrics(lyricAdjustment - 0.5));
    lyricsLater.addEventListener('click', () => adjustLyrics(lyricAdjustment + 0.5));
    lyricsReset.addEventListener('click', () => adjustLyrics(0));

    lyricsOffset.addEventListener('change', function() {
      const value = Number(lyricsOffset.value);
      if (!Number.isFinite(value) || Math.abs(value) > 600) {
        lyricsOffset.value = String(lyricAdjustment);
        lyricsStatus.textContent = '시간 조정은 -600초부터 600초까지 입력해 주세요.';
        return;
      }
      saveStatus.textContent = '';
      lyricAdjustment = value; refreshLyrics();
    });

    function chooseLyrics(record, videoGeneration) {
      if (videoGeneration !== generation || !ready) return false;
      try {
        const lines = record.syncedLyrics ? parseTimedLyrics(record.syncedLyrics) : [];
        if (!lines.length && !record.plainLyrics) throw new Error('이 결과에는 표시할 가사가 없어요.');
        resetPronunciation();
        selectedLyricRecord = record; lyricLines = lines; lyricAdjustment = 0; lyricsOffset.value = '0';
        renderTimedLyrics(); restorePronunciation();
        lyricsOffset.disabled = !lines.length;
        document.getElementById('lyrics-timing').hidden = !lines.length;
        document.getElementById('lyrics-plain').textContent = lines.length ? '' : record.plainLyrics;
        document.getElementById('lyrics-source').textContent = record.trackName + ' · ' + record.artistName + ' · ' + record.albumName + ' · LRCLIB #' + record.id;
        document.getElementById('lyrics-scripts').textContent = '표기: ' + lyricDescription(record).scripts;
        document.getElementById('save-status').textContent = '';
        document.getElementById('lyrics-settings').open = false;
        if (lyricsPanel.open) lyricsPanel.close();
        document.getElementById('lyric-window').scrollTop = 0;
        lyricsStatus.textContent = lines.length ? '영상과 가사가 어긋나면 시간을 조정해 주세요.' : '시간표시가 없는 가사예요. 영상에 맞춰 자동으로 움직이지 않아요.';
        refreshLyrics(); return true;
      } catch (error) { lyricsStatus.textContent = error.message; return false; }
    }

    async function readBoundedJson(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let size = 0, text = '';
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 4 * 1048576) throw new Error('검색 결과가 너무 커요. 검색어를 구체적으로 입력해 주세요.');
          text += decoder.decode(chunk.value, { stream: true });
        }
        return JSON.parse(text + decoder.decode());
      } finally { await reader.cancel(); }
    }

    const scriptRules = [
      ['한글', /\p{Script=Hangul}/u], ['가나', /[\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]/u],
      ['한자', /\p{Script=Han}/u], ['라틴 문자', /\p{Script=Latin}/u],
      ['키릴 문자', /\p{Script=Cyrillic}/u], ['아랍 문자', /\p{Script=Arabic}/u],
      ['데바나가리', /\p{Script=Devanagari}/u], ['태국 문자', /\p{Script=Thai}/u],
      ['히브리 문자', /\p{Script=Hebrew}/u], ['그리스 문자', /\p{Script=Greek}/u]
    ];
    const lyricDescriptions = new WeakMap();
    function lyricDescription(record) {
      if (lyricDescriptions.has(record)) return lyricDescriptions.get(record);
      const text = (record.syncedLyrics || record.plainLyrics || '').split(/\r?\n/).map(line => {
        if (record.syncedLyrics) {
          if (/^\s*\[(ar|al|ti|au|by|re|ve|length|offset):/i.test(line)) return '';
          line = line.replace(/\[\d+:\d+(?:\.\d+)?]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '');
        }
        return line.trim();
      }).filter(Boolean).join('\n');
      const counts = new Map();
      for (const letter of text.normalize('NFKC')) {
        if (!/\p{Letter}/u.test(letter)) continue;
        const name = scriptRules.find(rule => rule[1].test(letter))?.[0] || '기타 문자';
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      if (counts.has('가나')) {
        counts.set('일본어', counts.get('가나') + (counts.get('한자') || 0));
        counts.delete('가나'); counts.delete('한자');
      }
      const labels = [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name);
      if (!labels.length) labels.push('표기 미상');
      const result = { labels, scripts: labels.join(' · '), preview: [...text.split('\n').slice(0, 2).join(' / ')].slice(0, 100).join('') };
      lyricDescriptions.set(record, result); return result;
    }

    function normalizeLyricRecord(item) {
      if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.trackName !== 'string' || typeof item.artistName !== 'string') return null;
      return { id: item.id, trackName: item.trackName.slice(0, 500), artistName: item.artistName.slice(0, 500),
        albumName: typeof item.albumName === 'string' ? item.albumName.slice(0, 500) : '', duration: item.duration,
        instrumental: item.instrumental === true, syncedLyrics: typeof item.syncedLyrics === 'string' ? item.syncedLyrics : '',
        plainLyrics: typeof item.plainLyrics === 'string' ? item.plainLyrics : '' };
    }

    function renderLyricCandidates(videoGeneration) {
      const duration = ready && player ? player.getDuration() : 0;
      rankedDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
      const distance = item => Number.isFinite(item.duration) && item.duration > 0 ? Math.abs(item.duration - rankedDuration) : Infinity;
      const records = rankedDuration ? [...lyricCandidates].sort((a, b) => distance(a) - distance(b)) : lyricCandidates;
      document.getElementById('lyrics-ranking').textContent = !records.length ? '' : rankedDuration
        ? '영상 ' + time(rankedDuration) + ' · 길이 차이가 작은 순서예요. 같은 곡·버전인지 확인해 주세요.'
        : '영상 길이를 확인하면 길이 차이가 작은 순서로 정렬해요.';
      lyricsResults.replaceChildren();
      for (const item of records.slice(0, 20)) {
        const record = item;
        const button = document.createElement('button'); button.type = 'button';
        const hasLyrics = !record.instrumental && (record.syncedLyrics || record.plainLyrics);
        const duration = Number.isFinite(record.duration) && record.duration > 0 ? time(record.duration) : '길이 미상';
        function part(className, text, parent = button) {
          const span = document.createElement('span'); span.className = className; span.textContent = text;
          parent.append(span); return span;
        }
        part('candidate-title', record.trackName);
        const album = record.albumName.trim().toLowerCase() === record.trackName.trim().toLowerCase() ? '' : record.albumName;
        part('candidate-detail', record.artistName + (album ? ' · ' + album : ''));
        const badges = part('candidate-badges', '');
        if (hasLyrics) for (const label of lyricDescription(record).labels) part('candidate-badge', label, badges);
        part('candidate-badge candidate-type', record.instrumental ? '연주곡' : record.syncedLyrics ? '싱크 가사' : record.plainLyrics ? '일반 가사' : '가사 없음', badges);
        const difference = rankedDuration && Number.isFinite(distance(record)) ? ' · 영상과 ' + Number(distance(record).toFixed(1)) + '초 차이' : '';
        part('candidate-detail candidate-duration', duration + difference);
        if (hasLyrics) part('candidate-preview', lyricDescription(record).preview);
        button.disabled = !hasLyrics;
        button.addEventListener('click', () => chooseLyrics(record, videoGeneration));
        lyricsResults.append(button);
      }
    }

    // An album or video title as the query returns other tracks; detect that from the candidate titles.
    function comparableText(value) { return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, ''); }
    function titleInQuery(query) {
      const target = comparableText(query);
      return lyricCandidates.some(record => {
        const artist = comparableText(record.artistName);
        return record.trackName.replace(/[(\[{（［【][^)\]}）］】]*[)\]}）］】]/g, ' ').split(/\s[-–—]\s/)
          .map(comparableText).some(part => part && part !== artist && target.includes(part));
      });
    }

    async function searchLyrics(query, saved = null) {
      if (lyricBusy) return;
      if (!ready) { lyricsStatus.textContent = '먼저 YouTube 영상을 열어 주세요.'; return; }
      if (Date.now() < lyricRetryAt) {
        lyricsStatus.textContent = '요청이 많아요. ' + Math.ceil((lyricRetryAt - Date.now()) / 1000) + '초 뒤에 다시 검색해 주세요.';
        return;
      }
      if (!saved && (query.length < 2 || query.length > 120)) { lyricsStatus.textContent = '검색어를 2자부터 120자까지 입력해 주세요.'; return; }
      const videoGeneration = generation;
      const controller = new AbortController(); lyricRequest = controller;
      lyricBusy = true; lyricsButton.disabled = true; lyricCandidates = []; rankedDuration = 0;
      document.getElementById('lyrics-ranking').textContent = ''; lyricsResults.replaceChildren();
      lyricsStatus.textContent = 'LRCLIB에서 가사를 찾고 있어요…';
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const url = new URL(saved ? 'https://lrclib.net/api/get/' + saved.lyricId : 'https://lrclib.net/api/search');
        if (!saved) url.searchParams.set('q', query);
        const response = await fetch(url.toString(), {
          headers: { 'Lrclib-Client': 'SingBridge/0.1 (https://github.com/AndrewDongminYoo/sing_bridge)' },
          credentials: 'omit', signal: controller.signal
        });
        if (response.status === 429) {
          const retry = response.headers.get('Retry-After');
          const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
          lyricRetryAt = Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 60000);
          throw new Error('요청이 많아요. ' + Math.ceil((lyricRetryAt - Date.now()) / 1000) + '초 뒤에 다시 검색해 주세요.');
        }
        if (saved && response.status === 404) throw new Error('저장한 가사를 찾을 수 없어요. 다른 가사를 선택해 주세요.');
        if (!response.ok) throw new Error('가사를 불러오지 못했어요. 잠시 후 다시 검색해 주세요.');
        const records = await readBoundedJson(response);
        if (videoGeneration !== generation || controller.signal.aborted) return;
        if (saved) {
          const record = normalizeLyricRecord(records);
          if (!record || record.id !== saved.lyricId || record.instrumental) throw new Error('저장한 가사 응답이 올바르지 않아요. 다른 가사를 선택해 주세요.');
          if (chooseLyrics(record, videoGeneration)) {
            lyricAdjustment = lyricLines.length ? saved.offset : 0;
            lyricsOffset.value = String(lyricAdjustment); refreshLyrics();
          }
          return;
        }
        if (!Array.isArray(records)) throw new Error('가사 응답을 읽지 못했어요. 잠시 후 다시 검색해 주세요.');
        lyricCandidates = records.map(normalizeLyricRecord).filter(Boolean);
        renderLyricCandidates(videoGeneration);
        const count = lyricsResults.children.length;
        lyricsStatus.textContent = !count ? '검색 결과가 없어요. 노래 제목이나 가수를 바꿔 검색해 주세요.'
          : titleInQuery(query) ? '영상과 같은 곡·버전을 골라 주세요. 길이가 같아도 가사 시간이 다를 수 있어요.'
          : '검색어와 제목이 같은 가사를 찾지 못했어요. 앨범이나 영상 제목이 아닌 노래 제목으로 다시 검색해 보세요. 아래 결과도 고를 수 있어요.';
      } catch (error) {
        if (videoGeneration === generation) lyricsStatus.textContent = controller.signal.aborted ? '검색 시간이 초과됐어요. 다시 검색해 주세요.' : error instanceof SyntaxError ? '가사 응답을 읽지 못했어요.' : error.message;
      } finally {
        clearTimeout(timeout); controller.abort(); lyricBusy = false; lyricsButton.disabled = false;
        if (lyricRequest === controller) lyricRequest = null;
      }
    }

    function startLyricSearch(query) {
      if (lyricBusy) return Promise.resolve();
      lyricFinished = searchLyrics(query);
      return lyricFinished;
    }
    document.getElementById('lyrics-search').addEventListener('submit', function(event) {
      event.preventDefault();
      return startLyricSearch(lyricsQuery.value.trim());
    });
    </script>
""".trimIndent()
