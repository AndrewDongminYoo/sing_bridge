package io.github.andrewdongminyoo.singbridge

internal fun youtubePronunciationHtml(): String = """
    <section aria-labelledby="pronunciation-heading">
    <h3 id="pronunciation-heading">발음 도움</h3>
    <label for="pronunciation-target">읽을 언어</label>
    <select id="pronunciation-target">
    <option value="">언어를 선택하세요</option><option value="ko">한국어</option><option value="en">English</option>
    </select>
    <p class="candidate-detail">선택한 가사를 서버와 OpenAI에 보내 발음을 만듭니다. 번역이 아니며, 노래에서 부르는 발음과 다를 수 있어요.</p>
    <button id="pronunciation-generate" type="button" disabled>음차 만들기</button>
    <button id="pronunciation-toggle" type="button" aria-pressed="false" disabled>음차 숨기기</button>
    <button id="pronunciation-save" type="button" disabled>음차 저장</button>
    <details id="pronunciation-editor" hidden>
    <summary>음차 수정</summary>
    <label for="pronunciation-edit-line">수정할 가사</label>
    <select id="pronunciation-edit-line"></select>
    <p id="pronunciation-edit-source" class="candidate-detail"></p>
    <label for="pronunciation-edit-text">내가 읽을 발음</label>
    <textarea id="pronunciation-edit-text" rows="3" maxlength="2000" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
    <button id="pronunciation-edit-reset" type="button">생성한 음차로 되돌리기</button>
    <p class="candidate-detail">수정한 뒤 음차 저장을 눌러 주세요. 원문과 싱크는 바뀌지 않아요.</p>
    </details>
    <p id="pronunciation-status" role="status" aria-live="polite"></p>
    </section>
    <script>
    const pronunciationTarget = document.getElementById('pronunciation-target');
    const pronunciationButton = document.getElementById('pronunciation-generate');
    const pronunciationToggle = document.getElementById('pronunciation-toggle');
    const pronunciationStatus = document.getElementById('pronunciation-status');
    const pronunciationSave = document.getElementById('pronunciation-save');
    const pronunciationEditLine = document.getElementById('pronunciation-edit-line');
    const pronunciationEditText = document.getElementById('pronunciation-edit-text');
    let pronunciationEdits = {};
    let pronunciationResults = new Map(), pronunciationVersion = 0, pronunciationPending = null;
    let pronunciationAvailable = false, pronunciationBusy = false, pronunciationVisible = true;
    let pronunciationPort = null, pronunciationPortNonce = null;
    window.singBridgePreparePronunciationPort = nonce => { pronunciationPortNonce = nonce; };
    function initialPronunciationTarget(locale) {
      const language = String(locale).toLowerCase().split(/[-_]/)[0];
      return ['ko', 'en'].includes(language) ? language : '';
    }
    window.singBridgeConfigurePronunciation = function(locale, available) {
      pronunciationTarget.value = initialPronunciationTarget(locale);
      pronunciationAvailable = available;
      resetPronunciation(); restorePronunciation();
    };
    window.addEventListener('message', function(event) {
      if (!pronunciationPortNonce || event.data !== pronunciationPortNonce || !event.ports?.[0]) return;
      pronunciationPortNonce = null; pronunciationPort?.close();
      pronunciationPort = event.ports[0];
      pronunciationPort.onmessage = event => {
        try { window.singBridgePronunciationResult(JSON.parse(event.data)); } catch (_) { /* Ignore invalid bridge data. */ }
      };
      pronunciationPort.start();
    });
    function sendPronunciation(message) {
      if (pronunciationPort) pronunciationPort.postMessage(JSON.stringify(message));
      else if (window.webkit?.messageHandlers?.pronunciation) window.webkit.messageHandlers.pronunciation.postMessage(message);
      else throw new Error('bridge_unavailable');
    }
    function updatePronunciationControl() {
      pronunciationButton.disabled = !pronunciationAvailable || !pronunciationTarget.value || !lyricLines.some(line => line.text) || pronunciationBusy || pronunciationResults.size === lyricLines.filter(line => line.text).length;
      pronunciationToggle.disabled = !pronunciationResults.size;
      pronunciationSave.disabled = pronunciationBusy || !pronunciationResults.size || !validPronunciationEdits();
      document.getElementById('pronunciation-editor').hidden = !pronunciationResults.size;
      pronunciationEditLine.disabled = pronunciationBusy; pronunciationEditText.disabled = pronunciationBusy;
      document.getElementById('pronunciation-edit-reset').disabled = pronunciationBusy || !Object.hasOwn(pronunciationEdits, pronunciationEditLine.value);
      pronunciationToggle.textContent = pronunciationVisible ? '음차 숨기기' : '음차 보기';
      pronunciationToggle.setAttribute('aria-pressed', String(pronunciationVisible && pronunciationResults.size > 0));
    }
    function resetPronunciation() {
      pronunciationVersion++;
      if (pronunciationPending) {
        const pending = pronunciationPending; pronunciationPending = null;
        clearTimeout(pending.timeout); pending.reject(new Error('cancelled'));
        try { sendPronunciation({ cancel: true }); } catch (_) { /* Bridge may be unavailable. */ }
      }
      pronunciationBusy = false; pronunciationResults.clear(); pronunciationEdits = {}; pronunciationVisible = true;
      document.getElementById('pronunciation-editor').open = false; refreshPronunciationEditor();
      pronunciationStatus.textContent = pronunciationAvailable ? '싱크 가사를 선택한 뒤 음차를 만들 수 있어요. 만든 음차는 이 기기에 저장하고 수정할 수 있어요.' : '개발용 서버 연결이 있는 빌드에서 사용할 수 있어요.';
      renderPronunciation(); updatePronunciationControl();
    }
    function validatePronunciation(request, result) {
      function fields(value, keys) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== keys.sort().join()) throw new Error('invalid_response');
      }
      fields(result, ['target', 'lines']);
      if (result.target !== request.target || !Array.isArray(result.lines) || result.lines.length !== request.lines.length) throw new Error('invalid_response');
      result.lines.forEach((line, index) => {
        fields(line, ['id', 'segments']);
        if (line.id !== request.lines[index].id || !Array.isArray(line.segments) || !line.segments.length || line.segments.length > 40) throw new Error('invalid_response');
        for (const s of line.segments) {
          fields(s, ['source', 'language', 'reading', 'pronunciation', 'needsReview']);
          if (typeof s.source !== 'string' || !s.source.length || s.source.length > 500 || !['ja','ko','en','und'].includes(s.language) || typeof s.needsReview !== 'boolean') throw new Error('invalid_response');
          for (const key of ['reading','pronunciation']) if (s[key] !== null && (typeof s[key] !== 'string' || !s[key].length || s[key].length > 1000)) throw new Error('invalid_response');
          if ((s.language === request.target || s.language === 'und' || s.needsReview) && s.pronunciation !== null) throw new Error('invalid_response');
          if (s.language === 'und' && !s.needsReview) throw new Error('invalid_response');
          if (s.language !== request.target && !s.needsReview && !s.pronunciation?.trim()) throw new Error('invalid_response');
        }
        if (line.segments.map(s => s.source).join('') !== request.lines[index].text) throw new Error('invalid_response');
      });
      return result;
    }
    function renderPronunciation() {
      const names = { ja: '일본어', ko: '한국어', en: '영어', und: '언어 미확인' };
      lyricRows.forEach((row, index) => {
        row.textContent = lyricLines[index].text;
        const result = pronunciationResults.get('line-' + index);
        if (!pronunciationVisible || !result) return;
        const layer = document.createElement('span'); layer.className = 'pronunciation-layer';
        if (validEditedPronunciation(pronunciationEdits[result.id])) layer.textContent = pronunciationEdits[result.id];
        else for (const segment of result.segments) {
          const phrase = document.createElement('span');
          const leading = segment.source.match(/^\s*/)[0], trailing = segment.source.match(/\s*$/)[0];
          phrase.textContent = segment.pronunciation === null ? segment.source : leading + segment.pronunciation.trim() + trailing;
          phrase.title = names[segment.language] + (segment.needsReview ? ' · 발음 확인 필요' : '');
          phrase.setAttribute('aria-label', phrase.textContent + ' (' + phrase.title + ')');
          if (segment.needsReview && /\p{L}/u.test(segment.source)) phrase.className = 'pronunciation-review';
          layer.append(phrase);
        }
        row.append(layer);
        const languages = document.createElement('span'); languages.className = 'pronunciation-languages';
        languages.textContent = validEditedPronunciation(pronunciationEdits[result.id]) ? '직접 수정' : 'AI · ' + [...new Set(result.segments.filter(s => /\p{L}/u.test(s.source)).map(s => names[s.language]))].join(' · ') +
          (result.segments.some(s => s.needsReview && /\p{L}/u.test(s.source)) ? ' · 밑줄 구절은 원문 유지' : '');
        row.append(languages);
      });
      followDirty = true;
    }
    window.singBridgePronunciationResult = function(message) {
      const pending = pronunciationPending;
      if (!pending || message.id !== pending.id) return;
      pronunciationPending = null; clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error('unavailable'));
      else { try { pending.resolve(validatePronunciation(pending.request, message.result)); } catch (error) { pending.reject(error); } }
    };
    function requestPronunciation(request, id) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (pronunciationPending?.id !== id) return;
          pronunciationPending = null; reject(new Error('timeout'));
          try { sendPronunciation({ cancel: true }); } catch (_) { /* Native may already be closed. */ }
        }, 55000);
        pronunciationPending = { request, id, resolve, reject, timeout };
        try { sendPronunciation({ id, request }); }
        catch (error) { pronunciationPending = null; clearTimeout(timeout); reject(error); }
      });
    }
    function pronunciationText(result) {
      return result.segments.map(segment => segment.pronunciation === null ? segment.source :
        segment.source.match(/^\s*/)[0] + segment.pronunciation.trim() + segment.source.match(/\s*$/)[0]).join('');
    }
    function validEditedPronunciation(text) {
      return typeof text === 'string' && text.trim().length > 0 && text.length <= 2000 && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(text);
    }
    function validPronunciationEdits() {
      return Object.entries(pronunciationEdits).every(([id, text]) => pronunciationResults.has(id) &&
        validEditedPronunciation(text)) &&
        Object.values(pronunciationEdits).reduce((sum, text) => sum + text.length, 0) <= 30000;
    }
    function pronunciationSnapshot() {
      if (!pronunciationResults.size || pronunciationBusy || !validPronunciationEdits()) return null;
      return { version: 1, target: pronunciationTarget.value,
        source: lyricLines.map(line => ({ time: line.time, text: line.text })),
        lines: [...pronunciationResults.values()], edits: { ...pronunciationEdits } };
    }
    function validStoredPronunciation(data, target) {
      try {
        if (!data || data.version !== 1 || data.target !== target || !['ko', 'en'].includes(target) ||
            !Array.isArray(data.source) || !data.source.length || data.source.length > 240 ||
            !data.source.every(line => line && Number.isFinite(line.time) && line.time >= 0 &&
              typeof line.text === 'string' && line.text.length <= 500) ||
            data.source.reduce((sum, line) => sum + line.text.length, 0) > 30000 ||
            !Array.isArray(data.lines) || !data.lines.length || data.lines.length > data.source.length ||
            !data.edits || typeof data.edits !== 'object' || Array.isArray(data.edits)) return false;
        const ids = new Set();
        const request = { target, lines: data.lines.map(line => {
          if (!line || typeof line.id !== 'string' || !/^line-(0|[1-9][0-9]*)$/.test(line.id) || ids.has(line.id)) throw new Error('Invalid line');
          ids.add(line.id);
          const source = data.source[Number(line.id.slice(5))];
          if (!source?.text) throw new Error('Missing source');
          return { id: line.id, text: source.text };
        }) };
        validatePronunciation(request, { target, lines: data.lines });
        return Object.entries(data.edits).every(([id, text]) => ids.has(id) && validEditedPronunciation(text)) &&
          Object.values(data.edits).reduce((sum, text) => sum + text.length, 0) <= 30000;
      } catch (_) { return false; }
    }
    function restorePronunciation(useSavedTarget = true) {
      const entry = savedPractices.find(item => item.videoId === activeVideoId && item.lyricId === selectedLyricRecord?.id);
      if (useSavedTarget && entry?.pronunciationTarget) pronunciationTarget.value = entry.pronunciationTarget;
      const data = entry?.pronunciations?.[pronunciationTarget.value];
      if (data) {
        if (JSON.stringify(data.source) !== JSON.stringify(lyricLines.map(line => ({ time: line.time, text: line.text })))) {
          pronunciationStatus.textContent = '가사 내용이나 시간이 저장할 때와 달라 음차를 불러오지 않았어요. 기존 저장본은 유지됩니다.';
        } else {
          pronunciationResults = new Map(data.lines.map(line => [line.id, line])); pronunciationEdits = { ...data.edits };
          pronunciationStatus.textContent = '저장한 음차를 불러왔어요. 수정한 뒤 다시 저장할 수 있어요.';
        }
      }
      refreshPronunciationEditor(); renderPronunciation(); updatePronunciationControl();
    }
    function refreshPronunciationEditor() {
      const previous = pronunciationEditLine.value;
      pronunciationEditLine.replaceChildren();
      for (const result of pronunciationResults.values()) {
        const option = document.createElement('option'); option.value = result.id;
        const index = Number(result.id.slice(5));
        option.textContent = (index + 1) + '. ' + lyricLines[index].text;
        pronunciationEditLine.append(option);
      }
      pronunciationEditLine.value = pronunciationResults.has(previous) ? previous : [...pronunciationResults.keys()][0] || '';
      showPronunciationEdit();
    }
    function showPronunciationEdit() {
      const id = pronunciationEditLine.value, result = pronunciationResults.get(id);
      document.getElementById('pronunciation-edit-source').textContent = result ? lyricLines[Number(id.slice(5))].text : '';
      pronunciationEditText.value = result ? pronunciationEdits[id] ?? pronunciationText(result) : '';
    }
    pronunciationEditLine.addEventListener('change', function() { showPronunciationEdit(); updatePronunciationControl(); });
    document.getElementById('pronunciation-edit-reset').addEventListener('click', function() {
      if (pronunciationBusy) return;
      delete pronunciationEdits[pronunciationEditLine.value]; showPronunciationEdit();
      pronunciationStatus.textContent = '생성한 음차로 되돌렸어요. 변경 내용을 저장해 주세요.';
      renderPronunciation(); updatePronunciationControl(); updateSaveControl();
    });
    pronunciationEditText.addEventListener('input', function() {
      const id = pronunciationEditLine.value;
      if (pronunciationBusy || !pronunciationResults.has(id)) return;
      pronunciationEdits[id] = pronunciationEditText.value;
      pronunciationStatus.textContent = validPronunciationEdits() ? '수정한 음차를 아직 저장하지 않았어요.' : '줄바꿈이나 제어문자 없이 1~2,000자로 입력해 주세요. 수정 문구는 전체 30,000자까지 저장할 수 있어요.';
      renderPronunciation(); updatePronunciationControl(); updateSaveControl();
    });
    pronunciationSave.addEventListener('click', function() {
      if (pronunciationSave.disabled) return;
      pronunciationStatus.textContent = saveCurrentPractice(true) ? '음차와 수정 내용을 이 기기에 저장했어요.' : '저장하지 못했어요. 저장 공간과 입력 내용을 확인해 주세요. 기존 저장본은 유지됩니다.';
    });
    pronunciationTarget.addEventListener('change', function() { resetPronunciation(); restorePronunciation(false); });
    pronunciationToggle.addEventListener('click', function() {
      pronunciationVisible = !pronunciationVisible; renderPronunciation(); updatePronunciationControl();
    });
    pronunciationButton.addEventListener('click', async function() {
      if (pronunciationButton.disabled) return;
      const lines = lyricLines.map((line, index) => ({ id: 'line-' + index, text: line.text })).filter(line => line.text && !pronunciationResults.has(line.id));
      if (lines.length > 240 || lines.some(line => line.text.length > 500) || lines.reduce((sum, line) => sum + line.text.length, 0) > 30000) {
        pronunciationStatus.textContent = '가사가 너무 길어요. 다른 가사를 선택해 주세요.'; return;
      }
      pronunciationBusy = true; updatePronunciationControl(); updateSaveControl();
      const version = pronunciationVersion, target = pronunciationTarget.value;
      try {
        for (let start = 0; start < lines.length;) {
          const batch = []; let length = 0;
          while (start < lines.length && batch.length < 12 && length + lines[start].text.length <= 3000) {
            length += lines[start].text.length; batch.push(lines[start++]);
          }
          pronunciationStatus.textContent = '발음을 만들고 있어요… ' + pronunciationResults.size + '/' + lines.length;
          const result = await requestPronunciation({ target, lines: batch }, version + '-' + start);
          if (version !== pronunciationVersion) return;
          result.lines.forEach(line => pronunciationResults.set(line.id, line));
          renderPronunciation();
        }
        pronunciationStatus.textContent = '음차를 만들었어요. AI가 구절 언어와 발음을 추정하므로 원문과 함께 확인해 주세요.';
      } catch (_) {
        if (version === pronunciationVersion) pronunciationStatus.textContent = '음차를 완료하지 못했어요. 만든 구절과 원문은 유지됩니다. 서버 연결을 확인한 뒤 다시 시도해 주세요.';
      } finally {
        if (version === pronunciationVersion) { pronunciationBusy = false; refreshPronunciationEditor(); updatePronunciationControl(); updateSaveControl(); }
      }
    });
    </script>
""".trimIndent()
