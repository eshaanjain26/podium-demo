# Podium prototype

**Live:** https://eshaanjain26.github.io/podium-demo/

A clickable prototype of Podium, an open-source speaker profile: one place for your bio, headshot, links, and talks, with a public page you control and an API that event tools built for Sessionize can already read.

It runs entirely in the browser so it can live on free static hosting. There's no sign-in, nothing goes to a server, and each visitor gets their own copy of a fictional sample speaker, Jordan Rivera. Edits stay in that browser until "Reset sample data".

## What to try

| Page        | What it shows                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile     | Name, tagline, headshot, bios in several languages with a public pick, vanity URL, expertise tags, links                                            |
| Sessions    | A talk library: show or hide each talk on the public page, archive old ones without losing them                                                     |
| Public page | `/s/<slug>`, with only the sessions marked public                                                                                                   |
| Import      | Paste a public Sessionize event link, pick your own speaker record, copy in bio, tagline, links, and sessions. Sessionize's demo event is filled in |
| API         | The profile as Sessionize `Speakers` and `All` JSON, the shapes the full app serves at `/api/v1/profile/<slug>` and `/all`                          |
| Account     | Download everything as one JSON file, or delete it                                                                                                  |

## How the prototype differs from the full app

The full app (private repo) runs on PocketBase and SvelteKit with real accounts. Access rules, the integer session ids, and the API endpoints are enforced on the server there. This prototype reuses the same validation, Sessionize mapping, import, and export modules, and replaces the server with:

- an in-browser store (`src/lib/demo-db.ts`, saved to `localStorage`) that follows the same rules: reserved and malformed URLs are rejected, session `publicId`s are never reused, and private profiles produce no API output
- a direct browser call to Sessionize for import. Sessionize's public API allows any origin, and the same URL allowlist, size cap, timeout, and schema checks apply
- an API preview page instead of live endpoints

Hash routing (`/#/s/jordan-rivera`) lets every shared link load from GitHub Pages with a normal 200.

## Run it locally

Requires Node 22+.

```bash
npm install
npm run dev
```

```bash
npm test
```

Pushing to `main` runs lint, type checks, and tests, then deploys to GitHub Pages.

Podium is a clean-room project and isn't affiliated with Sessionize. All sample data is fictional and uses example domains.

## License

MIT
