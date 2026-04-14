/* ========================================
   AniRec — AniList GraphQL API Client
   Handles all communication with AniList
   ======================================== */

const AniListAPI = (() => {
  // AniList GraphQL endpoint
  const ANILIST_URL = 'https://graphql.anilist.co';

  // CORS proxy options (tried in order until one works)
  // If you deploy your own Cloudflare Worker, add its URL as the first option
  const PROXY_STRATEGIES = [
    // Strategy 1: Direct (in case AniList enables CORS in the future)
    (url) => url,
    // Strategy 2: corsproxy.io
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Strategy 3: allorigins
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // Strategy 4: cors.sh
    (url) => `https://proxy.cors.sh/${url}`,
  ];

  // Track which proxy strategy is currently working
  let workingStrategyIndex = 0;

  // Rate limiting: AniList allows ~90 req/min
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 800; // ms between requests

  /**
   * Send a GraphQL query to AniList (with proxy fallback)
   */
  async function query(graphqlQuery, variables = {}) {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLastReq = now - lastRequestTime;
    if (timeSinceLastReq < MIN_REQUEST_INTERVAL) {
      await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLastReq));
    }
    lastRequestTime = Date.now();

    const body = JSON.stringify({ query: graphqlQuery, variables });

    // Try the last-known working strategy first, then cycle through others
    const strategies = [
      workingStrategyIndex,
      ...Array.from({ length: PROXY_STRATEGIES.length }, (_, i) => i).filter(i => i !== workingStrategyIndex)
    ];

    let lastError = null;

    for (const stratIdx of strategies) {
      try {
        const apiUrl = PROXY_STRATEGIES[stratIdx](ANILIST_URL);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: body,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.errors) {
          throw new Error(`GraphQL Error: ${data.errors[0].message}`);
        }

        // This strategy works — remember it
        if (stratIdx !== workingStrategyIndex) {
          console.log(`AniRec: Switched to proxy strategy #${stratIdx}`);
          workingStrategyIndex = stratIdx;
        }

        return data.data;
      } catch (err) {
        lastError = err;
        console.warn(`AniRec: Proxy strategy #${stratIdx} failed:`, err.message);
        continue;
      }
    }

    throw new Error(`All API proxy strategies failed. Last error: ${lastError?.message}`);
  }

  /**
   * Search anime by name
   */
  async function searchAnime(searchTerm, page = 1, perPage = 10) {
    const gql = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
              color
            }
            bannerImage
            description(asHtml: false)
            genres
            tags {
              name
              rank
              category
            }
            averageScore
            meanScore
            popularity
            episodes
            status
            season
            seasonYear
            format
            studios(isMain: true) {
              nodes {
                name
              }
            }
            startDate {
              year
              month
            }
          }
        }
      }
    `;
    const data = await query(gql, { search: searchTerm, page, perPage });
    return data.Page;
  }

  /**
   * Get full details for a single anime by ID
   */
  async function getAnimeById(id) {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            color
          }
          bannerImage
          description(asHtml: false)
          genres
          tags {
            name
            rank
            category
          }
          averageScore
          meanScore
          popularity
          episodes
          duration
          status
          season
          seasonYear
          format
          source
          studios(isMain: true) {
            nodes {
              name
            }
          }
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          trailer {
            id
            site
          }
          recommendations(perPage: 6, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  large
                }
                averageScore
                genres
              }
            }
          }
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                }
                type
                format
                coverImage {
                  medium
                }
              }
            }
          }
        }
      }
    `;
    const data = await query(gql, { id });
    return data.Media;
  }

  /**
   * Get anime by genres/tags for recommendations
   */
  async function getAnimeByGenres(genres = [], tags = [], excludeIds = [], page = 1, perPage = 20) {
    const gql = `
      query ($page: Int, $perPage: Int, $genres: [String], $tags: [String], $idNotIn: [Int]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(
            type: ANIME
            genre_in: $genres
            tag_in: $tags
            id_not_in: $idNotIn
            sort: [SCORE_DESC, POPULARITY_DESC]
            averageScore_greater: 60
            isAdult: false
          ) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              medium
              color
            }
            bannerImage
            description(asHtml: false)
            genres
            tags {
              name
              rank
              category
            }
            averageScore
            meanScore
            popularity
            episodes
            status
            season
            seasonYear
            format
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const variables = {
      page,
      perPage,
      idNotIn: excludeIds,
    };

    // AniList requires genre_in and tag_in separately
    if (genres.length > 0) variables.genres = genres;
    if (tags.length > 0) variables.tags = tags;

    const data = await query(gql, variables);
    return data.Page;
  }

  /**
   * Get trending / popular anime (for cold start)
   */
  async function getTrending(page = 1, perPage = 20) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              medium
              color
            }
            bannerImage
            description(asHtml: false)
            genres
            tags {
              name
              rank
              category
            }
            averageScore
            popularity
            episodes
            status
            season
            seasonYear
            format
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;
    const data = await query(gql, { page, perPage });
    return data.Page;
  }

  /**
   * Get top rated anime of all time
   */
  async function getTopRated(page = 1, perPage = 20) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              medium
              color
            }
            genres
            tags {
              name
              rank
            }
            averageScore
            popularity
            episodes
            format
          }
        }
      }
    `;
    const data = await query(gql, { page, perPage });
    return data.Page;
  }

  // Public API
  return {
    searchAnime,
    getAnimeById,
    getAnimeByGenres,
    getTrending,
    getTopRated,
  };
})();
