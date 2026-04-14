/* ========================================
   AniRec — Cloudflare Worker (CORS Proxy)
   
   This is a lightweight backend that proxies
   requests to AniList's GraphQL API, adding
   the necessary CORS headers.
   
   DEPLOYMENT:
   1. Go to https://workers.cloudflare.com/ (free account)
   2. Click "Create a Worker"
   3. Paste this entire file into the editor
   4. Click "Deploy"
   5. Copy your worker URL (e.g., anirec-proxy.your-name.workers.dev)
   6. Update API_URL in js/api.js with your worker URL
   ======================================== */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Only allow POST (GraphQL queries)
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    try {
      // Forward the request to AniList
      const body = await request.text();

      const anilistResponse = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body,
      });

      const data = await anilistResponse.text();

      // Return the response with CORS headers
      return new Response(data, {
        status: anilistResponse.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + error.message }), {
        status: 500,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}
