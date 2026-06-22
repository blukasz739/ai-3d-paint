# AI 3D Paint

Aplikacja Next.js do rysowania obiektów, stylizacji przez [nano-banana-2](https://replicate.com/google/nano-banana-2) i generowania modelu 3D przez [TRELLIS.2](https://replicate.com/fishwowater/trellis2).

## Wymagania

- Node.js 18+
- Konto [Replicate](https://replicate.com) z tokenem API

## Instalacja

```bash
npm install
cp .env.example .env.local
```

Uzupełnij `REPLICATE_API_TOKEN` w pliku `.env.local`.

## Deploy na Netlify

1. W panelu Netlify: **Site configuration → Environment variables**
2. Dodaj zmienną:
   - **Key:** `REPLICATE_API_TOKEN`
   - **Value:** token z [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
   - **Scopes:** Production (i opcjonalnie Deploy previews)
3. **Trigger deploy** — sama zmiana zmiennej nie aktualizuje już działającej wersji bez nowego buildu.

Plik `.env.local` **nie trafia** na Netlify — działa tylko lokalnie.

## Uruchomienie

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## Przepływ

1. **Rysowanie** — wolny canvas, wybór materiału (drewno, metal, …) i narzędzi
2. **Stylizacja** — wybór stylu (realistyczny, animowany, …) → nano-banana-2 przekształca rysunek w gotowy obraz produktu
3. **Review** — akceptacja lub regeneracja obrazu
4. **Model 3D** — TRELLIS.2 generuje plik `.glb` (~5–10 min, ~$0.82/run)

## Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- Replicate API
- Three.js + React Three Fiber (podgląd GLB)

## Koszty

Generacja 3D na Replicate jest płatna. Stylizacja nano-banana-2 jest znacznie tańsza. Używaj świadomie w środowisku deweloperskim.
