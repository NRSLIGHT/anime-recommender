# 🎯 AniRec — Anime Recommendation Engine

> Discover your next favorite anime based on what you've already watched.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![AniList](https://img.shields.io/badge/AniList_API-02A9FF?style=flat&logo=anilist&logoColor=white)

## ✨ Features

- **🔍 Search** — Find any anime from AniList's database of 500k+ titles
- **📺 Watch List** — Track anime you've already seen (saved locally in your browser)
- **⭐ Rating System** — Rate your watched anime 1–5 stars to improve recommendations
- **💡 Smart Recommendations** — Content-based filtering matches your genre/tag preferences
- **📊 Taste Profile** — See your top genres and tags visualized
- **📱 Responsive** — Looks great on desktop, tablet, and mobile
- **🌙 Dark Theme** — Premium anime-inspired dark aesthetic

## 🚀 Live Demo

👉 **[View Live on GitHub Pages](https://<your-username>.github.io/anime-recommender/)**

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser    │────▶│   CORS Proxy     │────▶│  AniList    │
│  (Frontend)  │◀────│ (corsproxy.io or │◀────│  GraphQL    │
│              │     │  Cloudflare Wkr) │     │  API        │
│ localStorage │     └──────────────────┘     └─────────────┘
│  (watchlist) │
└──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Data Source** | [AniList GraphQL API](https://anilist.co) (500k+ anime) |
| **Storage** | Browser `localStorage` (no account needed) |
| **Backend** | CORS proxy (or optional Cloudflare Worker) |
| **Hosting** | GitHub Pages (static) |

## 📂 Project Structure

```
anime-recommender/
├── index.html              # Main page
├── css/
│   └── style.css           # Design system & all styles
├── js/
│   ├── api.js              # AniList GraphQL API client
│   ├── recommend.js        # Recommendation engine + localStorage
│   └── app.js              # UI rendering & event handling
├── worker/
│   └── index.js            # Optional Cloudflare Worker (CORS proxy)
└── README.md               # You are here!
```

## 🛠️ Setup & Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/anime-recommender.git
cd anime-recommender
```

### 2. Start a local server

You can use any static file server. Here are some options:

```bash
# Option A: Python (Python 3)
python -m http.server 8000

# Option B: Node.js (npx)
npx serve .

# Option C: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

### 3. Open in browser

Navigate to `http://localhost:8000` (or whatever port your server uses).

## 🌐 Deploy to GitHub Pages

1. **Create a GitHub repo** named `anime-recommender`
2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - AniRec anime recommender"
   git branch -M main
   git remote add origin https://github.com/<your-username>/anime-recommender.git
   git push -u origin main
   ```
3. **Enable GitHub Pages:**
   - Go to repo **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
   - Click **Save**
4. **Wait ~2 minutes**, then visit:
   `https://<your-username>.github.io/anime-recommender/`

## ⚡ Optional: Deploy Cloudflare Worker (Better Backend)

The default setup uses a free CORS proxy (`corsproxy.io`). For better reliability, deploy your own backend:

1. Go to [workers.cloudflare.com](https://workers.cloudflare.com/) (free account)
2. Click **Create a Worker**
3. Paste the contents of `worker/index.js` into the editor
4. Click **Deploy**
5. Copy your worker URL (e.g., `https://anirec-proxy.your-name.workers.dev`)
6. Update `js/api.js`:
   ```javascript
   const API_URL = 'https://anirec-proxy.your-name.workers.dev';
   ```

## 🧠 How the Recommendation Algorithm Works

1. **Watches are tracked** — When you add anime, their genres and tags are stored
2. **Taste profile is built** — Genre/tag frequencies are calculated, weighted by your star ratings
3. **AniList is queried** — The engine searches for anime matching your top genres & tags
4. **Results are scored** — Each candidate gets a match score based on overlap with your profile
5. **Already-watched anime are filtered** — Only fresh suggestions are shown

## 📃 License

MIT License — free to use, modify, and distribute.

---

Built with 💜 using the [AniList API](https://anilist.co)
