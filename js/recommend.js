/* ========================================
   AniRec — Recommendation Engine
   Content-based filtering using genre/tag
   similarity from user's watch history
   ======================================== */

const RecommendEngine = (() => {
  const STORAGE_KEY = 'anirec_watchlist';

  /* ---------- Watch List Management ---------- */

  /**
   * Get all watched anime from localStorage
   * Returns: Array of { id, title, coverImage, genres, tags, averageScore, userRating, ... }
   */
  function getWatchList() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save watch list to localStorage
   */
  function saveWatchList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /**
   * Add an anime to the watch list
   */
  function addToWatchList(anime) {
    const list = getWatchList();
    if (list.find(a => a.id === anime.id)) return false; // Already exists

    const entry = {
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres || [],
      tags: (anime.tags || []).map(t => ({ name: t.name, rank: t.rank || 50 })),
      averageScore: anime.averageScore,
      episodes: anime.episodes,
      format: anime.format,
      seasonYear: anime.seasonYear,
      userRating: 0, // 0 = not rated, 1-5 = user rating
      addedAt: Date.now(),
    };

    list.push(entry);
    saveWatchList(list);
    return true;
  }

  /**
   * Remove an anime from the watch list
   */
  function removeFromWatchList(animeId) {
    let list = getWatchList();
    list = list.filter(a => a.id !== animeId);
    saveWatchList(list);
  }

  /**
   * Check if anime is in the watch list
   */
  function isInWatchList(animeId) {
    return getWatchList().some(a => a.id === animeId);
  }

  /**
   * Set user rating for a watched anime (1-5 stars)
   */
  function setRating(animeId, rating) {
    const list = getWatchList();
    const anime = list.find(a => a.id === animeId);
    if (anime) {
      anime.userRating = Math.min(5, Math.max(0, rating));
      saveWatchList(list);
      return true;
    }
    return false;
  }

  /**
   * Get user rating for an anime
   */
  function getRating(animeId) {
    const anime = getWatchList().find(a => a.id === animeId);
    return anime ? anime.userRating : 0;
  }

  /**
   * Clear entire watch list
   */
  function clearWatchList() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ---------- Profile Analysis ---------- */

  /**
   * Build a user taste profile from their watch list
   * Returns weighted genre and tag frequencies
   */
  function buildUserProfile() {
    const watchList = getWatchList();
    if (watchList.length === 0) return null;

    const genreWeights = {};
    const tagWeights = {};

    watchList.forEach(anime => {
      // Weight by user rating (if rated) — higher rated anime influence profile more
      const ratingMultiplier = anime.userRating > 0 ? (anime.userRating / 3) : 1;

      // Count genre frequencies with rating weight
      (anime.genres || []).forEach(genre => {
        genreWeights[genre] = (genreWeights[genre] || 0) + ratingMultiplier;
      });

      // Count tag frequencies with rating weight and tag rank
      (anime.tags || []).forEach(tag => {
        const tagWeight = (tag.rank || 50) / 100; // Higher rank = more relevant
        tagWeights[tag.name] = (tagWeights[tag.name] || 0) + (ratingMultiplier * tagWeight);
      });
    });

    // Sort by weight and take top items
    const sortedGenres = Object.entries(genreWeights)
      .sort((a, b) => b[1] - a[1]);

    const sortedTags = Object.entries(tagWeights)
      .sort((a, b) => b[1] - a[1]);

    return {
      genres: sortedGenres,
      tags: sortedTags,
      topGenres: sortedGenres.slice(0, 5).map(g => g[0]),
      topTags: sortedTags.slice(0, 8).map(t => t[0]),
      totalWatched: watchList.length,
      watchedIds: watchList.map(a => a.id),
    };
  }

  /* ---------- Recommendation Generation ---------- */

  /**
   * Generate recommendations based on user profile
   * Returns sorted array of { anime, matchScore }
   */
  async function getRecommendations() {
    const profile = buildUserProfile();
    
    if (!profile || profile.totalWatched === 0) {
      // Cold start: return trending anime
      const trending = await AniListAPI.getTrending(1, 30);
      return {
        anime: trending.media.map(a => ({ ...a, matchScore: 0 })),
        type: 'trending',
        message: 'Add anime you\'ve watched to get personalized recommendations!',
      };
    }

    // Fetch anime matching top genres and tags
    const results = [];
    const seenIds = new Set(profile.watchedIds);

    try {
      // Query 1: Top genres + top tags (best matches)
      if (profile.topGenres.length > 0) {
        const topTags = profile.topTags.slice(0, 3);
        const page1 = await AniListAPI.getAnimeByGenres(
          profile.topGenres.slice(0, 3),
          topTags,
          profile.watchedIds,
          1,
          30
        );
        if (page1 && page1.media) {
          page1.media.forEach(anime => {
            if (!seenIds.has(anime.id)) {
              seenIds.add(anime.id);
              results.push(anime);
            }
          });
        }
      }

      if (profile.topGenres.length > 2) {
        const secondaryGenres = profile.topGenres.slice(1, 4);
        const page2 = await AniListAPI.getAnimeByGenres(
          secondaryGenres,
          [],
          [...profile.watchedIds, ...Array.from(seenIds)],
          1,
          20
        );
        if (page2 && page2.media) {
          page2.media.forEach(anime => {
            if (!seenIds.has(anime.id)) {
              seenIds.add(anime.id);
              results.push(anime);
            }
          });
        }
      }

      // Query 3: Broader exploration with different tag combos
      if (profile.topTags.length > 3) {
        const exploreTags = profile.topTags.slice(3, 6);
        const page3 = await AniListAPI.getAnimeByGenres(
          profile.topGenres.slice(0, 2),
          exploreTags,
          [...profile.watchedIds, ...Array.from(seenIds)],
          1,
          15
        );
        if (page3 && page3.media) {
          page3.media.forEach(anime => {
            if (!seenIds.has(anime.id)) {
              seenIds.add(anime.id);
              results.push(anime);
            }
          });
        }
      }

    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }

    // Score each result based on genre/tag overlap with user profile
    const scored = results.map(anime => {
      let score = 0;
      const maxScore = (profile.genres.length + profile.tags.length) || 1;

      // Genre match scoring
      (anime.genres || []).forEach(genre => {
        const weight = profile.genres.find(g => g[0] === genre);
        if (weight) {
          score += weight[1]; // Add the genre weight from profile
        }
      });

      // Tag match scoring
      (anime.tags || []).forEach(tag => {
        const weight = profile.tags.find(t => t[0] === tag.name);
        if (weight) {
          score += weight[1] * 0.5; // Tags contribute less than genres
        }
      });

      // Bonus for high-rated anime
      if (anime.averageScore) {
        score += (anime.averageScore / 100) * 2;
      }

      // Normalize to 0-100
      const normalizedScore = Math.min(99, Math.round((score / (maxScore * 0.3)) * 100));

      return {
        ...anime,
        matchScore: normalizedScore,
      };
    });

    // Sort by match score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return {
      anime: scored.slice(0, 36),
      type: 'personalized',
      message: `Based on your ${profile.totalWatched} watched anime`,
      profile: {
        topGenres: profile.topGenres,
        topTags: profile.topTags.slice(0, 5),
      },
    };
  }

  // Public API
  return {
    getWatchList,
    addToWatchList,
    removeFromWatchList,
    isInWatchList,
    setRating,
    getRating,
    clearWatchList,
    buildUserProfile,
    getRecommendations,
  };
})();
