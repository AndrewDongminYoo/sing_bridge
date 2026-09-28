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
        savedPractices = next; renderSavedPractices(); return true;
      } catch (_) { return false; }
    }
    function updateSaveControl() {
      const selected = savedPractices.find(entry => entry.videoId === activeVideoId && entry.lyricId === selectedLyricRecord?.id);
      const unchanged = selected && selected.offset === lyricAdjustment;
      saveButton.disabled = !ready || !activeVideoId || !selectedLyricRecord || !!unchanged || pronunciationBusy;
      saveButton.textContent = unchanged ? '저장됨' : selected ? '변경 내용 저장' : '이 연습 저장';
    }
    function saveCurrentPractice(includePronunciation = false) {
      if (!ready || !activeVideoId || !selectedLyricRecord || pronunciationBusy) return false;
      const draft = includePronunciation ? pronunciationSnapshot() : null;
      if (includePronunciation && !draft) return false;
      const entry = { videoId: activeVideoId, lyricId: selectedLyricRecord.id,
        title: (selectedLyricRecord.artistName + ' - ' + selectedLyricRecord.trackName).slice(0, 1000), offset: lyricAdjustment };
      const previous = savedPractices.find(item => item.videoId === entry.videoId && item.lyricId === entry.lyricId);
      if (previous?.pronunciations) entry.pronunciations = previous.pronunciations;
      if (previous?.pronunciationTarget) entry.pronunciationTarget = previous.pronunciationTarget;
      if (draft) { entry.pronunciations = { ...entry.pronunciations, [draft.target]: draft }; entry.pronunciationTarget = draft.target; }
      if (!validSavedEntry(entry)) { saveStatus.textContent = '이 연습을 저장하지 못했어요.'; return false; }
      const remaining = savedPractices.filter(item => item.videoId !== entry.videoId || item.lyricId !== entry.lyricId);
      if (remaining.length >= 20) { saveStatus.textContent = '최대 20개까지 저장할 수 있어요. 노래 찾기에서 저장한 연습을 삭제해 주세요.'; return false; }
      const saved = writeSavedPractices([entry, ...remaining]);
      saveStatus.textContent = saved
        ? '영상·가사 선택·싱크를 저장했어요. 노래 찾기에서 다시 열 수 있어요.'
        : '저장하지 못했어요. 저장 공간이나 기기 설정을 확인해 주세요.';
      updateSaveControl(); return saved;
    }
    saveButton.addEventListener('click', function() { saveCurrentPractice(); });
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
