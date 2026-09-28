package io.github.andrewdongminyoo.singbridge

internal fun youtubeSearchHtml(): String = """
    <section aria-label="YouTube 노래 검색">
    <form id="song-search">
    <label for="song-query">가수 - 제목</label>
    <input id="song-query" type="search" maxlength="120" autocorrect="off" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="Vaundy - 踊り子">
    <button id="song-search-button" class="button-primary" type="submit">노래 검색</button>
    </form>
    <p id="song-status" role="status" aria-live="polite">YouTube에서 가장 관련성 높은 영상을 찾고, 같은 정보로 가사도 검색해요.</p>
    </section>
    <script>
    const youtubeApiKey = '__YOUTUBE_API_KEY__';
    const songQuery = document.getElementById('song-query');
    const songStatus = document.getElementById('song-status');
    const songButton = document.getElementById('song-search-button');
    let searchSequence = 0, songRequest = null, songRetryAt = 0;
    if (!youtubeApiKey) songStatus.textContent = '이 빌드에서는 노래 검색을 사용할 수 없어요. 아래에 영상 링크를 입력해 주세요.';

    function cancelSongSearch() {
      searchSequence++;
      if (songRequest) songRequest.abort();
      songRequest = null; songButton.disabled = false;
      songStatus.textContent = '';
    }

    document.getElementById('song-search').addEventListener('submit', async function(event) {
      event.preventDefault();
      cancelSongSearch();
      if (!youtubeApiKey) { songStatus.textContent = '노래 검색을 사용할 수 없어요. 아래에 영상 링크를 입력해 주세요.'; return; }
      if (!apiReady) { songStatus.textContent = 'YouTube 연결을 기다리고 있어요. 잠시 후 다시 시도해 주세요.'; return; }
      const value = songQuery.value.trim();
      const separator = value.match(/\s+-\s+/);
      const artist = separator ? value.slice(0, separator.index).trim() : '';
      const title = separator ? value.slice(separator.index + separator[0].length).trim() : '';
      if (!artist || !title || value.length > 120) { songStatus.textContent = '가수 - 제목 형식으로 120자 이내로 입력해 주세요.'; return; }
      if (Date.now() < songRetryAt) { songStatus.textContent = '요청이 많아요. 잠시 후 다시 검색해 주세요.'; return; }
      const query = artist + ' ' + title;
      const sequence = searchSequence;
      const controller = new AbortController(); songRequest = controller; songButton.disabled = true;
      songStatus.textContent = 'YouTube에서 노래를 찾고 있어요…';
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        for (const [name, value] of Object.entries({ part: 'snippet', type: 'video', order: 'relevance', videoEmbeddable: 'true', videoSyndicated: 'true', maxResults: '1', q: query })) url.searchParams.set(name, value);
        const response = await fetch(url.toString(), { headers: { 'X-Goog-Api-Key': youtubeApiKey }, credentials: 'omit', redirect: 'error', signal: controller.signal });
        if (sequence !== searchSequence) return;
        if (response.status === 429) {
          const retry = response.headers.get('Retry-After');
          const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
          songRetryAt = Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 60000);
          songStatus.textContent = '요청이 많아요. 잠시 후 다시 검색하거나 영상 링크로 열어 주세요.'; return;
        }
        if (response.status === 403) { songStatus.textContent = '지금은 YouTube 검색을 사용할 수 없어요. 검색 한도나 연결 설정을 확인하고, 영상 링크로 열어 주세요.'; return; }
        if (!response.ok) throw new Error('Search unavailable');
        const data = await readBoundedJson(response);
        if (sequence !== searchSequence || controller.signal.aborted) return;
        if (!Array.isArray(data?.items)) throw new Error('Invalid search response');
        if (!data.items.length) { songStatus.textContent = '재생할 수 있는 영상을 찾지 못했어요. 검색어를 바꾸거나 영상 링크로 열어 주세요.'; return; }
        const item = data.items[0];
        if (!/^[A-Za-z0-9_-]{11}$/.test(item?.id?.videoId || '') || typeof item?.snippet?.title !== 'string' || typeof item?.snippet?.channelTitle !== 'string') throw new Error('Invalid video');
        const videoLabel = item.snippet.title.slice(0, 500) + ' · ' + item.snippet.channelTitle.slice(0, 500);
        songStatus.textContent = '가장 관련성 높은 영상을 열었어요. 다른 곡이면 검색어를 바꾸거나 링크로 열어 주세요.';
        input.value = 'https://www.youtube.com/watch?v=' + item.id.videoId;
        openVideo(item.id.videoId, query, sequence, null, videoLabel);
      } catch (_) {
        if (sequence === searchSequence) songStatus.textContent = controller.signal.aborted
          ? '검색 시간이 초과됐어요. 다시 검색하거나 영상 링크로 열어 주세요.'
          : '노래를 찾지 못했어요. 연결을 확인하거나 영상 링크로 열어 주세요.';
      } finally {
        clearTimeout(timeout); controller.abort();
        if (songRequest === controller) { songRequest = null; songButton.disabled = false; }
      }
    });
    </script>
""".trimIndent()
