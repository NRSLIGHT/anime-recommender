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
