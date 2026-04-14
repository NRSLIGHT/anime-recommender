/* ========================================
   AniRec — Main Application
   UI rendering, event handling, DOM logic
   ======================================== */

const App = (() => {
  // DOM element references
  let els = {};

  // State
  let searchTimeout = null;
  let isSearching = false;
  let currentRecommendations = [];

  /* ---------- Initialization ---------- */

  function init() {
    cacheElements();
    bindEvents();
    createParticles();
    updateStats();
    loadWatchList();
    loadRecommendations();
  }

  function cacheElements() {
    els = {
      searchInput: document.getElementById('search-input'),
      searchBtn: document.getElementById('search-btn'),
      searchDropdown: document.getElementById('search-dropdown'),
      watchedGrid: document.getElementById('watched-grid'),
      watchedSection: document.getElementById('watched-section'),
      watchedEmpty: document.getElementById('watched-empty'),
      recsGrid: document.getElementById('recs-grid'),
      recsSection: document.getElementById('recs-section'),
      recsEmpty: document.getElementById('recs-empty'),
      recsMessage: document.getElementById('recs-message'),
      recsLoading: document.getElementById('recs-loading'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalContent: document.getElementById('modal-detail'),
      statWatched: document.getElementById('stat-watched'),
      statRecs: document.getElementById('stat-recs'),
      toastContainer: document.getElementById('toast-container'),
      clearBtn: document.getElementById('clear-watchlist-btn'),
      refreshBtn: document.getElementById('refresh-recs-btn'),
      particlesContainer: document.getElementById('particles'),
      trendingSection: document.getElementById('trending-section'),
      trendingGrid: document.getElementById('trending-grid'),
      profileTags: document.getElementById('profile-tags'),
      genreSelector: document.getElementById('genre-selector'),
    };
  }

  function bindEvents() {
    // Search input with debounce
    els.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const term = e.target.value.trim();
      if (term.length < 2) {
        hideSearchDropdown();
        return;
      }
      searchTimeout = setTimeout(() => performSearch(term), 400);
    });

    // Search button click
    els.searchBtn.addEventListener('click', () => {
      const term = els.searchInput.value.trim();
      if (term.length >= 2) performSearch(term);
    });

    // Enter key in search
    els.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const term = els.searchInput.value.trim();
        if (term.length >= 2) performSearch(term);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        hideSearchDropdown();
      }
    });

    // Modal close
    els.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === els.modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Clear watchlist
    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', () => {
        if (confirm('Remove all anime from your watched list?')) {
          RecommendEngine.clearWatchList();
          loadWatchList();
          loadRecommendations();
          showToast('Watch list cleared', 'info');
        }
      });
    }

    // Refresh recommendations
    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', () => {
        loadRecommendations();
      });
    }

    // Genre selector chips
    if (els.genreSelector) {
      els.genreSelector.querySelectorAll('.genre-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          // Toggle active state
          const wasActive = chip.classList.contains('active');
          els.genreSelector.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
          if (!wasActive) {
            chip.classList.add('active');
            browseByGenre(chip.dataset.genre);
          } else {
            // Deselect — go back to recommendations
            loadRecommendations();
          }
        });
      });
    }
  }

  /* ---------- Genre Browse ---------- */

  async function browseByGenre(genre) {
    els.recsGrid.style.display = 'none';
    els.recsEmpty.style.display = 'none';
    els.recsLoading.style.display = 'flex';
    if (els.recsMessage) els.recsMessage.textContent = `Browsing ${genre} anime...`;
    if (els.profileTags) els.profileTags.innerHTML = '';

    try {
      const watchedIds = RecommendEngine.getWatchList().map(a => a.id);
      const result = await AniListAPI.getAnimeByGenres([genre], [], watchedIds, 1, 30);

      els.recsLoading.style.display = 'none';

      if (!result.media || result.media.length === 0) {
        els.recsEmpty.style.display = 'block';
        return;
      }

      const scored = result.media.map(a => ({ ...a, matchScore: 0 }));
      currentRecommendations = scored;
      renderRecommendations(scored, 'browse');
      updateStats();

    } catch (error) {
      console.error('Genre browse error:', error);
      els.recsLoading.style.display = 'none';
      els.recsEmpty.style.display = 'block';
    }
  }

  /* ---------- Search ---------- */

  async function performSearch(term) {
    if (isSearching) return;
    isSearching = true;

    showSearchLoading();

    try {
      const results = await AniListAPI.searchAnime(term, 1, 8);
      renderSearchResults(results.media || []);
    } catch (error) {
      console.error('Search error:', error);
      els.searchDropdown.innerHTML = `
        <div class="search-no-results">
          <p>⚠️ Search failed. Please try again.</p>
        </div>
      `;
      showSearchDropdown();
    }

    isSearching = false;
  }

  function renderSearchResults(results) {
    if (results.length === 0) {
      els.searchDropdown.innerHTML = `
        <div class="search-no-results">
          <p>😅 No anime found. Try a different search term.</p>
        </div>
      `;
      showSearchDropdown();
      return;
    }

    const html = results.map(anime => {
      const title = anime.title.english || anime.title.romaji;
      const coverUrl = anime.coverImage?.medium || anime.coverImage?.large || '';
      const year = anime.seasonYear || '';
      const format = anime.format || '';
      const episodes = anime.episodes ? `${anime.episodes} eps` : '';
      const meta = [format, year, episodes].filter(Boolean).join(' · ');
      const isWatched = RecommendEngine.isInWatchList(anime.id);

      return `
        <div class="search-result-item" data-id="${anime.id}">
          <img src="${coverUrl}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2245%22 height=%2264%22><rect fill=%22%231a1a3e%22 width=%2245%22 height=%2264%22/><text x=%2222%22 y=%2236%22 fill=%22%237c3aed%22 font-size=%2218%22 text-anchor=%22middle%22>🎬</text></svg>'">
          <div class="search-result-info">
            <h4>${escapeHtml(title)}</h4>
            <p>${meta}</p>
          </div>
          <button class="add-btn ${isWatched ? 'added' : ''}" 
                  onclick="event.stopPropagation(); App.addFromSearch(${anime.id})" 
                  id="add-btn-${anime.id}">
            ${isWatched ? '✓ Added' : '+ Add'}
          </button>
        </div>
      `;
    }).join('');

    els.searchDropdown.innerHTML = html;

    // Click on result row to view details
    els.searchDropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn')) return;
        const id = parseInt(item.dataset.id);
        openAnimeDetail(id);
        hideSearchDropdown();
      });
    });

    showSearchDropdown();
  }

  function showSearchDropdown() {
    els.searchDropdown.classList.add('active');
  }

  function hideSearchDropdown() {
    els.searchDropdown.classList.remove('active');
  }

  function showSearchLoading() {
    els.searchDropdown.innerHTML = `
      <div class="search-loading">
        <div class="spinner"></div>
        <span style="margin-left: 8px;">Searching AniList...</span>
      </div>
    `;
    showSearchDropdown();
  }

  /* ---------- Add from Search ---------- */

  // Cache of fetched anime data for adding from search
  let searchCache = {};

  async function addFromSearch(animeId) {
    try {
      const anime = await AniListAPI.getAnimeById(animeId);
      const added = RecommendEngine.addToWatchList(anime);

      if (added) {
        // Update button state
        const btn = document.getElementById(`add-btn-${animeId}`);
        if (btn) {
          btn.textContent = '✓ Added';
          btn.classList.add('added');
        }

        showToast(`Added "${anime.title.english || anime.title.romaji}" to your list!`, 'success');
        loadWatchList();
        loadRecommendations();
        updateStats();
      } else {
        showToast('Already in your watch list', 'info');
      }
    } catch (error) {
      console.error('Error adding anime:', error);
      showToast('Failed to add anime. Try again.', 'error');
    }
  }

  /* ---------- Watch List ---------- */

  function loadWatchList() {
    const list = RecommendEngine.getWatchList();

    if (list.length === 0) {
      els.watchedGrid.style.display = 'none';
      els.watchedEmpty.style.display = 'block';
      if (els.clearBtn) els.clearBtn.style.display = 'none';
      updateStats();
      return;
    }

    els.watchedGrid.style.display = 'grid';
    els.watchedEmpty.style.display = 'none';
    if (els.clearBtn) els.clearBtn.style.display = 'inline-flex';

    const html = list.map((anime, i) => {
      const title = anime.title?.english || anime.title?.romaji || 'Unknown';
      const coverUrl = anime.coverImage?.large || anime.coverImage?.medium || '';
      const score = anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : '';
      const episodes = anime.episodes ? `${anime.episodes} eps` : '';
      const format = anime.format || '';
      const meta = [format, episodes].filter(Boolean).join(' · ');

      // Rating stars
      const userRating = anime.userRating || 0;
      const stars = [1, 2, 3, 4, 5].map(n =>
        `<span class="star ${n <= userRating ? 'active' : ''}" 
              onclick="event.stopPropagation(); App.rateAnime(${anime.id}, ${n})">★</span>`
      ).join('');

      return `
        <div class="anime-card" style="animation-delay: ${i * 0.05}s" onclick="App.openAnimeDetail(${anime.id})">
          <div class="card-image">
            <img src="${coverUrl}" alt="${escapeHtml(title)}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect fill=%22%231a1a3e%22 width=%22200%22 height=%22300%22/><text x=%22100%22 y=%22160%22 fill=%22%237c3aed%22 font-size=%2240%22 text-anchor=%22middle%22>🎬</text></svg>'">
            <div class="card-overlay">
              <button class="view-btn">View Details</button>
            </div>
          </div>
          <div class="card-actions">
            <button class="action-btn" onclick="event.stopPropagation(); App.removeAnime(${anime.id})" title="Remove">✕</button>
          </div>
          ${score ? `<div class="card-score">${score}</div>` : ''}
          <div class="card-body">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="card-meta">${meta}</div>
            <div class="card-rating" id="rating-${anime.id}">
              ${stars}
              <span class="rating-label">${userRating > 0 ? userRating + '/5' : 'Rate'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    els.watchedGrid.innerHTML = html;
    updateStats();
  }

  function removeAnime(animeId) {
    RecommendEngine.removeFromWatchList(animeId);
    loadWatchList();
    loadRecommendations();
    showToast('Removed from watch list', 'info');
  }

  function rateAnime(animeId, rating) {
    const currentRating = RecommendEngine.getRating(animeId);
    // Toggle off if clicking the same star
    const newRating = currentRating === rating ? 0 : rating;
    RecommendEngine.setRating(animeId, newRating);

    // Update UI
    const container = document.getElementById(`rating-${animeId}`);
    if (container) {
      const stars = container.querySelectorAll('.star');
      stars.forEach((star, i) => {
        star.classList.toggle('active', i < newRating);
      });
      const label = container.querySelector('.rating-label');
      if (label) label.textContent = newRating > 0 ? `${newRating}/5` : 'Rate';
    }

    showToast(newRating > 0 ? `Rated ${newRating}/5 ★` : 'Rating cleared', 'success');
  }

  /* ---------- Recommendations ---------- */

  async function loadRecommendations() {
    els.recsGrid.style.display = 'none';
    els.recsEmpty.style.display = 'none';
    els.recsLoading.style.display = 'flex';
    if (els.profileTags) els.profileTags.innerHTML = '';

    try {
      const result = await RecommendEngine.getRecommendations();

      els.recsLoading.style.display = 'none';

      if (els.recsMessage) {
        els.recsMessage.textContent = result.message || '';
      }

      // Show taste profile tags
      if (result.profile && els.profileTags) {
        const tags = [
          ...result.profile.topGenres.map(g => `<span class="filter-tab active">${g}</span>`),
          ...result.profile.topTags.map(t => `<span class="filter-tab">${t}</span>`),
        ];
        els.profileTags.innerHTML = tags.join('');
      }

      if (!result.anime || result.anime.length === 0) {
        els.recsEmpty.style.display = 'block';
        return;
      }

      currentRecommendations = result.anime;
      renderRecommendations(result.anime, result.type);
      updateStats();

    } catch (error) {
      console.error('Recommendation error:', error);
      els.recsLoading.style.display = 'none';
      els.recsEmpty.style.display = 'block';
      els.recsEmpty.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <h3>Failed to load recommendations</h3>
        <p>Please check your internet connection and try again.</p>
      `;
    }
  }

  function renderRecommendations(animeList, type) {
    els.recsGrid.style.display = 'grid';

    const html = animeList.map((anime, i) => {
      const title = anime.title?.english || anime.title?.romaji || 'Unknown';
      const coverUrl = anime.coverImage?.large || anime.coverImage?.medium || '';
      const score = anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : '';
      const episodes = anime.episodes ? `${anime.episodes} eps` : '';
      const format = anime.format || '';
      const meta = [format, episodes].filter(Boolean).join(' · ');
      const matchScore = anime.matchScore > 0 ? `${anime.matchScore}% match` : '';
      const isWatched = RecommendEngine.isInWatchList(anime.id);

      const genres = (anime.genres || []).slice(0, 3).map(g =>
        `<span class="genre-tag">${g}</span>`
      ).join('');

      return `
        <div class="anime-card" style="animation-delay: ${i * 0.05}s" onclick="App.openAnimeDetail(${anime.id})">
          <div class="card-image">
            <img src="${coverUrl}" alt="${escapeHtml(title)}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect fill=%22%231a1a3e%22 width=%22200%22 height=%22300%22/><text x=%22100%22 y=%22160%22 fill=%22%237c3aed%22 font-size=%2240%22 text-anchor=%22middle%22>🎬</text></svg>'">
            <div class="card-overlay">
              <button class="view-btn">${isWatched ? '✓ Watched' : '+ Add & View'}</button>
            </div>
          </div>
          ${matchScore && type === 'personalized' ? `<div class="match-badge">${matchScore}</div>` : ''}
          ${score ? `<div class="card-score">${score}</div>` : ''}
          <div class="card-body">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="card-meta">${meta}</div>
            <div class="card-genres">${genres}</div>
          </div>
        </div>
      `;
    }).join('');

    els.recsGrid.innerHTML = html;
  }

  /* ---------- Trending ---------- */

  async function loadTrending() {
    if (!els.trendingGrid) return;

    try {
      const result = await AniListAPI.getTrending(1, 10);
      const html = (result.media || []).map((anime, i) => {
        const title = anime.title?.english || anime.title?.romaji || 'Unknown';
        const coverUrl = anime.coverImage?.large || '';
        const score = anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : '';

        return `
          <div class="anime-card" style="animation-delay: ${i * 0.05}s" onclick="App.openAnimeDetail(${anime.id})">
            <div class="card-image">
              <img src="${coverUrl}" alt="${escapeHtml(title)}" loading="lazy">
              <div class="card-overlay">
                <button class="view-btn">View</button>
              </div>
            </div>
            ${score ? `<div class="card-score">${score}</div>` : ''}
            <div class="card-body">
              <div class="card-title">${escapeHtml(title)}</div>
            </div>
          </div>
        `;
      }).join('');

      els.trendingGrid.innerHTML = html;
    } catch (err) {
      console.error('Trending load failed:', err);
    }
  }

  /* ---------- Anime Detail Modal ---------- */

  async function openAnimeDetail(animeId) {
    els.modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Show loading state
    els.modalContent.innerHTML = `
      <div class="loading-section" style="min-height: 300px;">
        <div class="spinner"></div>
        <span>Loading anime details...</span>
      </div>
    `;

    try {
      const anime = await AniListAPI.getAnimeById(animeId);
      renderModal(anime);
    } catch (error) {
      console.error('Error loading anime details:', error);
      els.modalContent.innerHTML = `
        <div class="loading-section" style="min-height: 300px;">
          <p>⚠️ Failed to load details. Please try again.</p>
          <button class="btn-primary" onclick="App.closeModal()">Close</button>
        </div>
      `;
    }
  }

  function renderModal(anime) {
    const title = anime.title?.english || anime.title?.romaji || 'Unknown';
    const nativeTitle = anime.title?.native || '';
    const bannerUrl = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || '';
    const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
    const description = anime.description
      ? anime.description.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '').substring(0, 600)
      : 'No description available.';
    const genres = (anime.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');
    const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
    const episodes = anime.episodes || '?';
    const duration = anime.duration ? `${anime.duration} min` : '';
    const status = anime.status ? anime.status.replace(/_/g, ' ') : '';
    const season = anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : anime.seasonYear || '';
    const studio = anime.studios?.nodes?.[0]?.name || '';
    const format = anime.format || '';
    const source = anime.source ? anime.source.replace(/_/g, ' ') : '';
    const isWatched = RecommendEngine.isInWatchList(anime.id);
    const userRating = RecommendEngine.getRating(anime.id);

    // Trailer link
    let trailerHtml = '';
    if (anime.trailer?.site === 'youtube') {
      trailerHtml = `<a href="https://www.youtube.com/watch?v=${anime.trailer.id}" target="_blank" class="btn-outline" style="display:inline-flex;align-items:center;gap:6px;">▶ Watch Trailer</a>`;
    }

    // Recommendations from AniList
    let recsHtml = '';
    if (anime.recommendations?.nodes?.length > 0) {
      const recCards = anime.recommendations.nodes
        .filter(r => r.mediaRecommendation)
        .map(r => {
          const rec = r.mediaRecommendation;
          const recTitle = rec.title?.english || rec.title?.romaji || '';
          const recCover = rec.coverImage?.large || '';
          return `
            <div class="anime-card" style="min-width:140px;max-width:160px;" onclick="App.openAnimeDetail(${rec.id})">
              <div class="card-image">
                <img src="${recCover}" alt="${escapeHtml(recTitle)}" loading="lazy">
              </div>
              <div class="card-body" style="padding:8px">
                <div class="card-title" style="font-size:0.75rem">${escapeHtml(recTitle)}</div>
              </div>
            </div>
          `;
        }).join('');

      recsHtml = `
        <div style="margin-top:var(--space-xl)">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--space-md);">
            🔗 Similar Anime
          </h3>
          <div style="display:flex;gap:var(--space-md);overflow-x:auto;padding-bottom:var(--space-md);">
            ${recCards}
          </div>
        </div>
      `;
    }

    // Rating stars for modal
    const stars = [1, 2, 3, 4, 5].map(n =>
      `<span class="star ${n <= userRating ? 'active' : ''}" 
            style="font-size:1.4rem;cursor:pointer;" 
            onclick="App.rateAnime(${anime.id}, ${n})">★</span>`
    ).join('');

    els.modalContent.innerHTML = `
      <div class="modal-banner">
        <img src="${bannerUrl}" alt="" onerror="this.style.display='none'">
      </div>
      <button class="modal-close" onclick="App.closeModal()">✕</button>
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-poster">
            <img src="${coverUrl}" alt="${escapeHtml(title)}">
          </div>
          <div class="modal-info">
            <h2>${escapeHtml(title)}</h2>
            ${nativeTitle ? `<p class="modal-subtitle">${escapeHtml(nativeTitle)}</p>` : ''}
            <div class="modal-stats">
              <div class="modal-stat">⭐ <strong>${score}</strong></div>
              <div class="modal-stat">📺 ${episodes} eps</div>
              ${duration ? `<div class="modal-stat">⏱️ ${duration}</div>` : ''}
              ${format ? `<div class="modal-stat">${format}</div>` : ''}
              ${status ? `<div class="modal-stat">${status}</div>` : ''}
            </div>
            <div class="modal-stats">
              ${season ? `<div class="modal-stat">📅 ${season}</div>` : ''}
              ${studio ? `<div class="modal-stat">🏢 ${studio}</div>` : ''}
              ${source ? `<div class="modal-stat">📖 ${source}</div>` : ''}
            </div>
            <div class="modal-genres">${genres}</div>
          </div>
        </div>

        <p class="modal-description">${escapeHtml(description)}</p>

        ${isWatched ? `
          <div style="margin-bottom:var(--space-xl)">
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-sm);">Your Rating:</p>
            <div class="card-rating" id="rating-${anime.id}" style="gap:4px;">
              ${stars}
              <span class="rating-label" style="font-size:0.9rem">${userRating > 0 ? userRating + '/5' : 'Not rated'}</span>
            </div>
          </div>
        ` : ''}

        <div class="modal-actions">
          ${isWatched
            ? `<button class="btn-danger" onclick="App.removeAnime(${anime.id}); App.closeModal();">✕ Remove from List</button>`
            : `<button class="btn-primary" onclick="App.addFromSearch(${anime.id}); App.closeModal();">+ Add to Watch List</button>`
          }
          ${trailerHtml}
          <a href="https://anilist.co/anime/${anime.id}" target="_blank" class="btn-outline">View on AniList ↗</a>
        </div>

        <!-- Watch Now Streaming Links -->
        <div style="margin-top:var(--space-xl)">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--space-md);">
            📺 Watch Now
          </h3>
          <div class="watch-links">
            <a href="https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title?.romaji || title)}" target="_blank" class="watch-link-btn crunchyroll">
              🍊 Crunchyroll
            </a>
            <a href="https://aniwatchtv.to/search?keyword=${encodeURIComponent(anime.title?.romaji || title)}" target="_blank" class="watch-link-btn aniwatch">
              🌐 AniWatch
            </a>
            <a href="https://myanimelist.net/anime.php?q=${encodeURIComponent(anime.title?.romaji || title)}&cat=anime" target="_blank" class="watch-link-btn">
              📋 MyAnimeList
            </a>
            <a href="https://www.google.com/search?q=watch+${encodeURIComponent(title)}+anime+online" target="_blank" class="watch-link-btn">
              🔍 Search Online
            </a>
          </div>
        </div>

        ${recsHtml}
      </div>
    `;
  }

  function closeModal() {
    els.modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ---------- UI Helpers ---------- */

  function updateStats() {
    const watchList = RecommendEngine.getWatchList();
    if (els.statWatched) {
      els.statWatched.textContent = watchList.length;
    }
    if (els.statRecs) {
      els.statRecs.textContent = currentRecommendations.length || '—';
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${escapeHtml(message)}`;

    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function createParticles() {
    if (!els.particlesContainer) return;
    const count = 30;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (Math.random() * 15 + 10) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.width = (Math.random() * 3 + 1) + 'px';
      p.style.height = p.style.width;

      // Randomize colors between purple and cyan
      const colors = ['var(--primary-light)', 'var(--accent-light)', 'var(--primary)'];
      p.style.background = colors[Math.floor(Math.random() * colors.length)];

      els.particlesContainer.appendChild(p);
    }
  }

  /* ---------- Utility ---------- */

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Public API ---------- */
  return {
    init,
    addFromSearch,
    removeAnime,
    rateAnime,
    openAnimeDetail,
    closeModal,
    loadRecommendations,
    browseByGenre,
  };
})();

// Boot the app
document.addEventListener('DOMContentLoaded', App.init);
