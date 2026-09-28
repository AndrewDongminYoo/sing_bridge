package io.github.andrewdongminyoo.singbridge

internal fun youtubeLyricsHtml(): String = """
    <section id="lyric-workspace" aria-label="가사 연습">
    <div id="lyric-window" tabindex="0" aria-label="가사">
    <p id="lyrics-placeholder">가사를 선택해 연습을 시작하세요.</p>
    <div id="lyrics-timing" hidden>
    <p id="lyric-previous" class="lyric-context"></p>
    <p id="lyric-current" class="lyric-current"></p>
    <p id="lyric-next" class="lyric-context"></p>
    </div>
    <p id="lyrics-plain" class="lyric-plain"></p>
    </div>
    <div class="lyric-meta">
    <a href="https://lrclib.net" aria-label="가사 제공: LRCLIB">LRCLIB</a>
    <p id="lyrics-offset-value" role="status" aria-live="polite" aria-label="가사 시간 조정">원래 시간</p>
    <button id="lyrics-panel-open" type="button">가사·설정</button>
    </div>
    <footer class="practice-controls" aria-label="연습 조작">
    <div class="transport-controls">
    <button id="back" type="button" disabled>5초 뒤로</button>
    <button id="forward" type="button" disabled>5초 앞으로</button>
    </div>
    <div class="sync-controls" role="group" aria-label="가사 싱크 조정">
    <button id="lyrics-earlier" type="button" disabled>0.5초 일찍</button>
    <button id="lyrics-later" type="button" disabled>0.5초 늦게</button>
    <button id="lyrics-reset" type="button" disabled>초기화</button>
    </div>
    </footer>
    <dialog id="lyrics-panel" aria-labelledby="lyrics-panel-heading">
    <div class="panel-toolbar">
    <h2 id="lyrics-panel-heading">가사·설정</h2>
    <button id="lyrics-panel-close" type="button">닫기</button>
    </div>
    <p id="video-details"></p>
    <p id="lyrics-source"></p>
    <details id="lyrics-settings" open>
    <summary>노래 제목·가수로 가사 찾기</summary>
    <form id="lyrics-search">
    <label for="lyrics-query">노래 제목·가수</label>
    <input id="lyrics-query" type="search" maxlength="120" autocorrect="off" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="노래 제목과 가수를 입력해 주세요">
    <button id="lyrics-search-button" type="submit">가사 검색</button>
    </form>
    <p>검색 결과에서 영상과 같은 곡·버전을 직접 골라 주세요.</p>
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
    let lyricCandidates = [], rankedDuration = 0;
    let lyricLines = [], lyricAdjustment = 0, lyricRequest = null, lyricBusy = false, lyricRetryAt = 0;

    let lyricFinished = Promise.resolve(), selectedLyricRecord = null;

    function resetLyrics() {
      if (lyricsPanel.open) lyricsPanel.close();
      document.getElementById('lyric-window').scrollTop = 0;
      if (lyricRequest) lyricRequest.abort();
      selectedLyricRecord = null; lyricLines = []; lyricAdjustment = 0; lyricsOffset.value = '0'; lyricsOffset.disabled = true;
      lyricCandidates = []; rankedDuration = 0;
      document.getElementById('lyrics-ranking').textContent = '';
      lyricsResults.replaceChildren();
      document.getElementById('lyrics-source').textContent = '';
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

    function showLyric(id, text) {
      const element = document.getElementById(id);
      if (element.textContent === text) return;
      element.textContent = text;
      element.scrollTop = 0;
      if (id === 'lyric-current') document.getElementById('lyric-window').scrollTop = 0;
    }

    function refreshLyrics() {
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
      showLyric('lyric-previous', index > 0 ? lyricLines[index - 1].text : '');
      showLyric('lyric-current', index >= 0 ? lyricLines[index].text : '');
      showLyric('lyric-next', index >= 0 && index + 1 < lyricLines.length ? lyricLines[index + 1].text : '');
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
      lyricAdjustment = value; refreshLyrics();
    });

    function chooseLyrics(record, videoGeneration) {
      if (videoGeneration !== generation || !ready) return;
      try {
        const lines = record.syncedLyrics ? parseTimedLyrics(record.syncedLyrics) : [];
        if (!lines.length && !record.plainLyrics) throw new Error('이 결과에는 표시할 가사가 없어요.');
        selectedLyricRecord = record; lyricLines = lines; lyricAdjustment = 0; lyricsOffset.value = '0';
        lyricsOffset.disabled = !lines.length;
        document.getElementById('lyrics-timing').hidden = !lines.length;
        document.getElementById('lyrics-plain').textContent = lines.length ? '' : record.plainLyrics;
        document.getElementById('lyrics-source').textContent = record.trackName + ' · ' + record.artistName + ' · ' + record.albumName + ' · LRCLIB #' + record.id;
        document.getElementById('lyrics-settings').open = false;
        if (lyricsPanel.open) lyricsPanel.close();
        document.getElementById('lyric-window').scrollTop = 0;
        lyricsStatus.textContent = lines.length ? '영상과 가사가 어긋나면 시간을 조정해 주세요.' : '시간표시가 없는 가사예요. 영상에 맞춰 자동으로 움직이지 않아요.';
        refreshLyrics();
      } catch (error) { lyricsStatus.textContent = error.message; }
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
        const record = { ...item, trackName: item.trackName.slice(0, 500), artistName: item.artistName.slice(0, 500), albumName: typeof item.albumName === 'string' ? item.albumName.slice(0, 500) : '', syncedLyrics: typeof item.syncedLyrics === 'string' ? item.syncedLyrics : '', plainLyrics: typeof item.plainLyrics === 'string' ? item.plainLyrics : '' };
        const button = document.createElement('button'); button.type = 'button';
        const hasLyrics = !record.instrumental && (record.syncedLyrics || record.plainLyrics);
        const duration = Number.isFinite(record.duration) && record.duration > 0 ? time(record.duration) : '길이 미상';
        button.textContent = record.trackName + ' · ' + record.artistName + ' · ' + record.albumName + ' · ' + duration + ' · ' + (record.instrumental ? '연주곡' : record.syncedLyrics ? '싱크 가사' : record.plainLyrics ? '일반 가사' : '가사 없음');
        if (rankedDuration && Number.isFinite(distance(record))) button.textContent += ' · 차이 ' + Number(distance(record).toFixed(1)) + '초';
        button.disabled = !hasLyrics;
        button.addEventListener('click', () => chooseLyrics(record, videoGeneration));
        lyricsResults.append(button);
      }
    }

    async function searchLyrics(query) {
      if (lyricBusy) return;
      if (!ready) { lyricsStatus.textContent = '먼저 YouTube 영상을 열어 주세요.'; return; }
      if (Date.now() < lyricRetryAt) {
        lyricsStatus.textContent = '요청이 많아요. ' + Math.ceil((lyricRetryAt - Date.now()) / 1000) + '초 뒤에 다시 검색해 주세요.';
        return;
      }
      if (query.length < 2 || query.length > 120) { lyricsStatus.textContent = '검색어를 2자부터 120자까지 입력해 주세요.'; return; }
      const videoGeneration = generation;
      const controller = new AbortController(); lyricRequest = controller;
      lyricBusy = true; lyricsButton.disabled = true; lyricCandidates = []; rankedDuration = 0;
      document.getElementById('lyrics-ranking').textContent = ''; lyricsResults.replaceChildren();
      lyricsStatus.textContent = 'LRCLIB에서 가사를 찾고 있어요…';
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const url = new URL('https://lrclib.net/api/search'); url.searchParams.set('q', query);
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
        if (!response.ok) throw new Error('가사를 불러오지 못했어요. 잠시 후 다시 검색해 주세요.');
        const records = await readBoundedJson(response);
        if (videoGeneration !== generation || controller.signal.aborted) return;
        if (!Array.isArray(records)) throw new Error('가사 응답을 읽지 못했어요. 잠시 후 다시 검색해 주세요.');
        lyricCandidates = records.filter(item => item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.trackName === 'string' && typeof item.artistName === 'string');
        renderLyricCandidates(videoGeneration);
        const count = lyricsResults.children.length;
        lyricsStatus.textContent = count ? '영상과 같은 곡·버전을 골라 주세요. 길이가 같아도 가사 시간이 다를 수 있어요.' : '검색 결과가 없어요. 노래 제목이나 가수를 바꿔 검색해 주세요.';
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
