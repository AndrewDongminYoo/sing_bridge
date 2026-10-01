package io.github.andrewdongminyoo.singbridge

internal fun youtubeLibraryHtml(): String = """
    <section id="saved-library-content" aria-labelledby="saved-heading">
    <h2 id="saved-heading">저장한 연습</h2>
    <p>영상·가사 선택·싱크와 저장한 음차를 이 기기에 보관해요. 다시 열 때 인터넷 연결이 필요해요.</p>
    <p id="saved-status" role="status" aria-live="polite"></p>
    <div id="saved-practices"></div>
    </section>
    <script>
    document.getElementById('saved-library').append(document.getElementById('saved-library-content'));
    const savedKey = 'singbridge.practice.v1';
    const savedStatus = document.getElementById('saved-status');
    const saveStatus = document.getElementById('save-status');
    const saveButton = document.getElementById('save-practice');
    let savedPractices = [], storageReadable = true;

    function validSavedEntry(entry) {
      return entry && typeof entry.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(entry.videoId) &&
        Number.isSafeInteger(entry.lyricId) && entry.lyricId > 0 && typeof entry.title === 'string' &&
        entry.title.length > 0 && entry.title.length <= 1000 && Number.isFinite(entry.offset) && Math.abs(entry.offset) <= 600 &&
        (entry.pronunciations === undefined || (entry.pronunciations && typeof entry.pronunciations === 'object' &&
          !Array.isArray(entry.pronunciations) && Object.entries(entry.pronunciations).every(([target, data]) => validStoredPronunciation(data, target)))) &&
        (entry.pronunciationTarget === undefined || ['ko', 'en'].includes(entry.pronunciationTarget));
    }
    function savedEntry(entry) {
      return { videoId: entry.videoId, lyricId: entry.lyricId, title: entry.title, offset: entry.offset,
        ...(entry.pronunciations ? { pronunciations: entry.pronunciations } : {}),
        ...(entry.pronunciationTarget ? { pronunciationTarget: entry.pronunciationTarget } : {}) };
    }
    try {
      const raw = localStorage.getItem(savedKey);
      if (raw !== null) {
        if (raw.length > 2097152) throw new Error('Storage too large');
        const data = JSON.parse(raw);
        if (data.version !== 1 || !Array.isArray(data.items) || data.items.length > 20 || !data.items.every(validSavedEntry)) throw new Error('Invalid storage');
        savedPractices = data.items.map(savedEntry);
        const keys = new Set(savedPractices.map(entry => entry.videoId + ':' + entry.lyricId));
        if (keys.size !== savedPractices.length) throw new Error('Duplicate entries');
      }
    } catch (_) {
      savedPractices = []; storageReadable = false;
      savedStatus.textContent = '저장 목록을 읽지 못했어요. 화면을 다시 열어 주세요. 기존 저장 데이터는 바꾸지 않았어요.';
    }
    function writeSavedPractices(next) {
      try {
        if (!storageReadable) throw new Error('Storage unavailable');
        const raw = JSON.stringify({ version: 1, items: next });
        if (raw.length > 2097152 || !next.every(validSavedEntry)) throw new Error('Storage too large or invalid');
        localStorage.setItem(savedKey, raw);
        savedPractices = next; renderSavedPractices(); updatePronunciationSaveState(); return true;
      } catch (_) { return false; }
    }
    // The current layer as it would be saved, or null when there is none or it cannot be saved: an invalid edit has no
    // snapshot, and storage rejects some generated layers, such as one whose source has more rows than it holds (#76).
    function storablePronunciation() {
      const snapshot = pronunciationResults.size ? pronunciationSnapshot() : null;
      return snapshot && validStoredPronunciation(snapshot, snapshot.target) ? snapshot : null;
    }
    // Whether the current target has a savable layer that differs from the saved entry, including a switch to another
    // saved target. It is computed when the pronunciation or the library changes, not in updateSaveControl, which runs
    // on every playback tick.
    let pronunciationUnsaved = false;
    function updatePronunciationSaveState() {
      const selected = savedPractices.find(entry => entry.videoId === activeVideoId && entry.lyricId === selectedLyricRecord?.id);
      const current = storablePronunciation();
      pronunciationUnsaved = !!current && (selected?.pronunciationTarget !== current.target ||
        JSON.stringify(current) !== JSON.stringify(selected?.pronunciations?.[current.target]));
      updateSaveControl();
    }
    function updateSaveControl() {
      const selected = savedPractices.find(entry => entry.videoId === activeVideoId && entry.lyricId === selectedLyricRecord?.id);
      const unchanged = selected && selected.offset === lyricAdjustment && !pronunciationUnsaved;
      saveButton.disabled = !ready || !activeVideoId || !selectedLyricRecord || !!unchanged || pronunciationBusy;
      saveButton.textContent = unchanged ? '저장됨' : selected ? '변경 내용 저장' : '이 연습 저장';
      updateShareControl();
    }
    // Practice sharing by code (docs/specs/2026-09-30-practice-sharing.md). Wire contract: iOS registers a
    // `share` message handler; Android posts a MessagePort after window.singBridgePrepareSharePort(nonce).
    // Either way the page sends one string of at most 2,000 characters.
    const shareButton = document.getElementById('share-practice');
    let sharePort = null, sharePortNonce = null;
    window.singBridgePrepareSharePort = nonce => { sharePortNonce = nonce; };
    window.addEventListener('message', function(event) {
      if (!sharePortNonce || event.data !== sharePortNonce || !event.ports?.[0]) return;
      sharePortNonce = null; sharePort?.close();
      sharePort = event.ports[0]; sharePort.start();
      updateShareControl();
    });
    function shareAvailable() { return !!sharePort || !!window.webkit?.messageHandlers?.share; }
    function updateShareControl() {
      shareButton.hidden = !shareAvailable();
      shareButton.disabled = !ready || !activeVideoId || !selectedLyricRecord;
    }
    function shareTitle(record) {
      // Provider text can add neither a line nor a code: separators, controls, format characters, and colons go.
      const flat = practiceTitle(record)
        .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}:]/gu, ' ').replace(/\s+/g, ' ').trim();
      return [...flat].slice(0, 500).join('').trim();
    }
    shareButton.addEventListener('click', function() {
      if (shareButton.disabled || !shareAvailable()) return;
      const message = ['singbridge:1:' + activeVideoId + ':' + selectedLyricRecord.id + ':' + Math.round(lyricAdjustment * 1000),
        'SingBridge 연습: ' + shareTitle(selectedLyricRecord), 'https://youtu.be/' + activeVideoId].join('\n');
      if (message.length > 2000) return;
      if (sharePort) sharePort.postMessage(message);
      else window.webkit.messageHandlers.share.postMessage(message);
    });
    // Returns null without a code, { invalid: true } for a bad or conflicting code, or the one code's fields.
    function sharedPracticeCode(text) {
      const markers = [...text.matchAll(/singbridge:/g)];
      if (!markers.length) return null;
      const codes = new Map();
      for (const marker of markers) {
        // Pasted lines may be joined without a separator, so the offset ends at the first character that cannot continue it.
        const match = /^singbridge:([^:\s]*):([^:\s]*):([^:\s]*):(-?[0-9]+)(?![0-9.:])/.exec(text.slice(marker.index));
        if (!match) return { invalid: true };
        const [, version, videoId, lyric, offset] = match;
        const lyricId = Number(lyric), milliseconds = Number(offset);
        if (version !== '1' || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || !/^[1-9][0-9]*$/.test(lyric) ||
            !Number.isSafeInteger(lyricId) || !/^-?(0|[1-9][0-9]*)$/.test(offset) || Math.abs(milliseconds) > 600000) return { invalid: true };
        codes.set(videoId + ':' + lyricId + ':' + milliseconds, { videoId, lyricId, offset: milliseconds / 1000 });
      }
      return codes.size === 1 ? [...codes.values()][0] : { invalid: true };
    }
    // One save keeps the practice and, when a generated layer has only valid edits, that layer too (#76).
    function saveCurrentPractice() {
      if (!ready || !activeVideoId || !selectedLyricRecord || pronunciationBusy) return false;
      const draft = storablePronunciation();
      // A layer that cannot be saved stays unsaved while the practice is saved.
      const skipped = pronunciationResults.size > 0 && !draft;
      const entry = { videoId: activeVideoId, lyricId: selectedLyricRecord.id,
        title: practiceTitle(selectedLyricRecord).slice(0, 1000), offset: lyricAdjustment };
      const previous = savedPractices.find(item => item.videoId === entry.videoId && item.lyricId === entry.lyricId);
      if (previous?.pronunciations) entry.pronunciations = previous.pronunciations;
      if (previous?.pronunciationTarget) entry.pronunciationTarget = previous.pronunciationTarget;
      if (draft) { entry.pronunciations = { ...entry.pronunciations, [draft.target]: draft }; entry.pronunciationTarget = draft.target; }
      if (!validSavedEntry(entry)) { saveStatus.textContent = '이 연습을 저장하지 못했어요.'; return false; }
      const remaining = savedPractices.filter(item => item.videoId !== entry.videoId || item.lyricId !== entry.lyricId);
      if (remaining.length >= 20) { saveStatus.textContent = '최대 20개까지 저장할 수 있어요. 노래 찾기에서 저장한 연습을 삭제해 주세요.'; return false; }
      const saved = writeSavedPractices([entry, ...remaining]);
      if (saved) timingSaveKey = entry.videoId + ':' + entry.lyricId;
      saveStatus.textContent = saved
        ? (draft ? '영상·가사 선택·싱크와 음차를 저장했어요.' : '영상·가사 선택·싱크를 저장했어요.') + ' 노래 찾기에서 다시 열 수 있어요.' +
          (skipped ? ' 음차에 저장할 수 없는 내용이 있어 음차는 저장하지 않았어요.' : '')
        : '저장하지 못했어요. 저장 공간이나 기기 설정을 확인해 주세요.';
      updateSaveControl(); return saved;
    }
    saveButton.addEventListener('click', function() { saveCurrentPractice(); });
    // Writes only the offset of the entry this practice was opened from or saved as; it never adds or recreates one (#76).
    function saveTiming() {
      const status = document.getElementById('sync-status'); status.textContent = '';
      const key = activeVideoId + ':' + selectedLyricRecord?.id;
      if (!selectedLyricRecord || timingSaveKey !== key) return;
      const index = savedPractices.findIndex(entry => entry.videoId + ':' + entry.lyricId === key);
      if (index < 0 || savedPractices[index].offset === lyricAdjustment) return;
      const next = savedPractices.map((entry, i) => i === index ? { ...entry, offset: lyricAdjustment } : entry);
      status.textContent = writeSavedPractices(next) ? '싱크를 저장했어요.' : '싱크를 저장하지 못했어요. 가사·설정에서 다시 저장해 주세요.';
      updateSaveControl();
    }
    function renderSavedPractices() {
      const list = document.getElementById('saved-practices'); list.replaceChildren();
      if (storageReadable) savedStatus.textContent = savedPractices.length ? '' : '아직 저장한 연습이 없어요.';
      for (const entry of savedPractices) {
        const row = document.createElement('div'); row.className = 'saved-practice';
        const open = document.createElement('button'); open.type = 'button';
        open.textContent = entry.title + ' · LRCLIB #' + entry.lyricId + ' · ' + entry.offset + '초';
        open.addEventListener('click', function() {
          if (!apiReady) { savedStatus.textContent = 'YouTube 연결을 기다리고 있어요. 잠시 후 다시 시도해 주세요.'; return; }
          cancelSongSearch();
          input.value = 'https://www.youtube.com/watch?v=' + entry.videoId;
          openVideo(entry.videoId, null, searchSequence, null, entry.title, entry);
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
        remove.setAttribute('aria-label', entry.title + ' 저장 삭제');
        remove.addEventListener('click', function() {
          const next = savedPractices.filter(item => item !== entry);
          if (!writeSavedPractices(next)) savedStatus.textContent = '삭제하지 못했어요. 다시 시도해 주세요.';
        });
        row.append(open, remove); list.append(row);
      }
    }
    renderSavedPractices();
    </script>
""".trimIndent()
