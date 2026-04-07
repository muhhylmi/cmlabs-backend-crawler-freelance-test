# CMLABS Backend Crawler Freelance Test

An API backend built with Node.js + TypeScript for asynchronous web crawling/scraping using Playwright, with an in-memory job queue and status endpoints to track progress.

## Main Features

- General web crawling (raw rendered HTML output).
- Structured crawling (JSON extraction output).
- Targeted scraping for:
  - `cmlabs.co` to HTML table
  - `sequence.day` to HTML table
  - Starbucks menu to HTML table
- Async job processing with concurrency control.
- Automatic retry on failed jobs.
- Job status endpoint and direct result viewing.
- Basic protections: CORS, JSON body parser, and rate limiting.

## Tech Stack

- Node.js
- TypeScript
- Express
- Playwright
- Cheerio
- p-limit
- Winston

## Project Structure

- `src/server.ts` - server bootstrap + graceful shutdown.
- `src/app.ts` - middleware and route setup.
- `src/routes/api.routes.ts` - API endpoint definitions.
- `src/controllers/crawl.controller.ts` - request/response handlers.
- `src/services/jobManager.ts` - in-memory queue and job management.
- `src/crawler/engine.ts` - crawling/scraping implementations.
- `src/crawler/parser.ts` - structured data extraction logic.
- `src/config/index.ts` - environment-based configuration.
- `output/` - generated crawl/scrape files.

## Prerequisites

- Node.js 18+ (latest LTS recommended).
- NPM.
- Playwright browser dependencies installed.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
copy env.example .env
```

3. (Recommended) install Playwright browsers:

```bash
npx playwright install
```

## Environment Configuration

Example from `env.example`:

```env
PORT=3000
NODE_ENV=production
CONCURRENCY_LIMIT=3
CRAWL_TIMEOUT_MS=30000
MAX_RETRIES=2
```

Description:

- `PORT`: application port.
- `NODE_ENV`: application mode (`development` / `production`).
- `CONCURRENCY_LIMIT`: maximum parallel jobs.
- `CRAWL_TIMEOUT_MS`: page load timeout during crawling.
- `MAX_RETRIES`: retry count when a job fails.

## Running the App

Development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run production build:

```bash
npm start
```

Default base URL:

```text
http://localhost:3000
```

## API Documentation

All API endpoints are under the `/api` prefix.

### 1) Health Check

- **Method**: `GET`
- **URL**: `/health`
- **Response 200**:

```json
{
  "status": "OK"
}
```

### 2) Trigger General Crawl

Create one or more crawl jobs.

- **Method**: `POST`
- **URL**: `/api/crawl?type=unstructured` or `/api/crawl?type=structured`
- **Query Param**:
  - `type` (required): `structured` | `unstructured`
- **Body**:

```json
{
  "urls": [
    "https://example.com",
    "https://cmlabs.co"
  ]
}
```

- **Response 202**:

```json
{
  "message": "Crawl jobs accepted.",
  "jobIds": ["uuid-1", "uuid-2"]
}
```

- **Possible Errors**:
  - `400` if `type` is invalid.
  - `400` if `urls` is missing / not an array / empty.
  - `400` if one of the URLs is invalid.

Mode differences:

- `unstructured`: saves a rendered `.html` page.
- `structured`: saves extracted `.json` data (`titles`, `points`, `cards`, `partnerships`).

### 3) Trigger CMLABS Scrape

- **Method**: `GET`
- **URL**: `/api/scrape/cmlabs`
- **Response 202**:

```json
{
  "message": "Scraping job started for CMLABS",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: HTML table file generated from `https://cmlabs.co`.

### 4) Trigger Sequence Scrape

- **Method**: `GET`
- **URL**: `/api/scrape/sequence`
- **Response 202**:

```json
{
  "message": "Scraping job started for Sequence.day",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: HTML table file generated from `https://www.sequence.day/`.

### 5) Trigger Starbucks Menu Scrape

- **Method**: `GET`
- **URL**: `/api/scrape/starbuck`
- **Response 202**:

```json
{
  "message": "Scraping job started for starbuck",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: HTML table menu file generated from `https://app.starbucks.com/menu`.

### 6) Check Job Status

- **Method**: `GET`
- **URL**: `/api/status/:jobId`
- **Path Param**:
  - `jobId` (required): job ID returned by trigger endpoints.
- **Response 200**:

```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "completed",
  "filePath": "output/example_com_1710000000000.html",
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-07T10:00:05.000Z"
}
```

Possible `status` values:

- `pending`
- `processing`
- `completed`
- `failed`

When status is `failed`, an `error` field is included.

If the job does not exist:

- **Response 404**:

```json
{
  "error": "Job not found."
}
```

### 7) View Result File Directly

When job status is `completed`, you can append `view=true`:

- **Method**: `GET`
- **URL**: `/api/status/:jobId?view=true`

Response will send the generated file directly instead of JSON.

## Quick cURL Examples

Trigger structured crawl:

```bash
curl -X POST "http://localhost:3000/api/crawl?type=structured" ^
  -H "Content-Type: application/json" ^
  -d "{\"urls\":[\"https://cmlabs.co\"]}"
```

Check job status:

```bash
curl "http://localhost:3000/api/status/<jobId>"
```

View output file:

```bash
curl "http://localhost:3000/api/status/<jobId>?view=true"
```

## Implementation Notes

- Job storage is currently **in-memory** (`Map`), so jobs are lost after server restart.
- For larger production scale, consider Redis + worker queue (for example BullMQ).
- Default rate limit: 100 requests per 15 minutes per IP.

## License

Not specified yet.
# CMLABS Backend Crawler Freelance Test

Backend API berbasis Node.js + TypeScript untuk menjalankan web crawling/scraping secara asynchronous menggunakan Playwright, dengan sistem job in-memory dan endpoint status untuk memantau proses.

## Fitur Utama

- Crawling halaman web umum (raw HTML).
- Crawling terstruktur (hasil ekstraksi JSON).
- Scraping khusus:
  - `cmlabs.co` ke format tabel HTML.
  - `sequence.day` ke format tabel HTML.
  - menu Starbucks ke format tabel HTML.
- Job processing asynchronous dengan pembatasan concurrency.
- Retry otomatis saat proses crawling gagal.
- Endpoint status untuk cek progress dan melihat hasil file.
- Proteksi dasar: CORS, JSON parser, dan rate limit.

## Tech Stack

- Node.js
- TypeScript
- Express
- Playwright
- Cheerio
- p-limit
- Winston

## Struktur Proyek Singkat

- `src/server.ts` - bootstrap server + graceful shutdown.
- `src/app.ts` - setup middleware dan route.
- `src/routes/api.routes.ts` - definisi endpoint API.
- `src/controllers/crawl.controller.ts` - handler request/response API.
- `src/services/jobManager.ts` - manajemen job queue in-memory.
- `src/crawler/engine.ts` - implementasi crawling/scraping.
- `src/crawler/parser.ts` - ekstraksi data terstruktur dari HTML.
- `src/config/index.ts` - pembacaan konfigurasi environment.
- `output/` - lokasi file hasil crawl/scrape.

## Prasyarat

- Node.js 18+ (disarankan LTS terbaru).
- NPM.
- Dependensi browser Playwright terpasang.

## Instalasi

1. Install dependency:

```bash
npm install
```

2. Salin environment file:

```bash
copy env.example .env
```

3. (Opsional tapi direkomendasikan) install browser Playwright:

```bash
npx playwright install
```

## Konfigurasi Environment

Contoh dari `env.example`:

```env
PORT=3000
NODE_ENV=production
CONCURRENCY_LIMIT=3
CRAWL_TIMEOUT_MS=30000
MAX_RETRIES=2
```

Keterangan:

- `PORT`: port aplikasi.
- `NODE_ENV`: mode aplikasi (`development` / `production`).
- `CONCURRENCY_LIMIT`: jumlah maksimal job diproses bersamaan.
- `CRAWL_TIMEOUT_MS`: timeout saat membuka halaman.
- `MAX_RETRIES`: jumlah retry saat job gagal.

## Menjalankan Aplikasi

Mode development:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Run production:

```bash
npm start
```

Base URL default:

```text
http://localhost:3000
```

## Dokumentasi API

Semua endpoint API berada di prefix `/api`.

### 1) Health Check

- **Method**: `GET`
- **URL**: `/health`
- **Response 200**:

```json
{
  "status": "OK"
}
```

### 2) Trigger Crawl Umum

Menambahkan 1 atau lebih URL ke job queue.

- **Method**: `POST`
- **URL**: `/api/crawl?type=unstructured` atau `/api/crawl?type=structured`
- **Query Param**:
  - `type` (wajib): `structured` | `unstructured`
- **Body**:

```json
{
  "urls": [
    "https://example.com",
    "https://cmlabs.co"
  ]
}
```

- **Response 202**:

```json
{
  "message": "Crawl jobs accepted.",
  "jobIds": [
    "uuid-1",
    "uuid-2"
  ]
}
```

- **Kemungkinan Error**:
  - `400` jika `type` tidak valid.
  - `400` jika `urls` tidak ada / bukan array / kosong.
  - `400` jika URL tidak valid.

Perbedaan mode:

- `unstructured`: hasil file `.html` halaman yang sudah dirender.
- `structured`: hasil file `.json` dari ekstraksi elemen penting (`titles`, `points`, `cards`, `partnerships`).

### 3) Trigger Scrape CMLABS

- **Method**: `GET`
- **URL**: `/api/scrape/cmlabs`
- **Response 202**:

```json
{
  "message": "Scraping job started for CMLABS",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: file HTML tabel hasil ekstraksi data dari `https://cmlabs.co`.

### 4) Trigger Scrape Sequence

- **Method**: `GET`
- **URL**: `/api/scrape/sequence`
- **Response 202**:

```json
{
  "message": "Scraping job started for Sequence.day",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: file HTML tabel hasil ekstraksi data dari `https://www.sequence.day/`.

### 5) Trigger Scrape Starbucks Menu

- **Method**: `GET`
- **URL**: `/api/scrape/starbuck`
- **Response 202**:

```json
{
  "message": "Scraping job started for starbuck",
  "jobId": "uuid",
  "statusEndpoint": "/api/status/uuid"
}
```

Output: file HTML tabel menu dari `https://app.starbucks.com/menu`.

### 6) Cek Status Job

- **Method**: `GET`
- **URL**: `/api/status/:jobId`
- **Path Param**:
  - `jobId` (wajib): ID job dari endpoint trigger.
- **Response 200**:

```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "completed",
  "filePath": "output/example_com_1710000000000.html",
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-07T10:00:05.000Z"
}
```

Kemungkinan nilai `status`:

- `pending`
- `processing`
- `completed`
- `failed`

Jika `failed`, properti `error` akan tersedia.

Jika job belum ada:

- **Response 404**:

```json
{
  "error": "Job not found."
}
```

### 7) Lihat Hasil File Langsung di Browser

Saat job `completed`, Anda bisa menambahkan query `view=true`:

- **Method**: `GET`
- **URL**: `/api/status/:jobId?view=true`

Response akan mengirim file hasil (`sendFile`) langsung, bukan JSON.

## Contoh Penggunaan Cepat (cURL)

Trigger crawl terstruktur:

```bash
curl -X POST "http://localhost:3000/api/crawl?type=structured" ^
  -H "Content-Type: application/json" ^
  -d "{\"urls\":[\"https://cmlabs.co\"]}"
```

Cek status job:

```bash
curl "http://localhost:3000/api/status/<jobId>"
```

Lihat file hasil:

```bash
curl "http://localhost:3000/api/status/<jobId>?view=true"
```

## Catatan Implementasi

- Penyimpanan job masih **in-memory** (`Map`), sehingga data job hilang saat server restart.
- Untuk production skala besar, pertimbangkan migrasi ke Redis + queue worker (mis. BullMQ).
- Rate limit default: 100 request / 15 menit per IP.

## Lisensi

Belum ditentukan.
