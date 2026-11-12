# Aniro brief — automated media pipeline (film → upload → auto-assign → files)

**Goal:** from the moment someone films content, they upload it and it is automatically
filed against the right **shoot / project / client** — no manual sorting. This brief is
for the Aniro team to build the ingestion/automation layer on top of the foundation
that already exists in Blanc Script OS.

## What already exists (built, in this repo)
- **`media_assets` table** (the file registry) with links to `shoot_id`, `project_id`,
  `client_id`, `deliverable_id`, `content_item_id`, plus `kind`, `file_name`, `mime_type`,
  `size_bytes`, `storage_provider`, `storage_key`, `status` (pending → uploaded → ready),
  and `uploader_user_id`. Every row is `org_id`-scoped.
- **Storage adapter** `lib/storage/r2.ts` — Cloudflare R2 (S3-compatible) behind a tiny
  interface (`presignPutUrl`, `presignGetUrl`, `deleteObject`, `storageConfigured`).
  Written so Frame.io / Google Drive can be added as sibling adapters.
- **Server data layer** `lib/data/media.ts` — `createUploadTarget` (registers a pending
  asset + returns a presigned PUT URL, stores the chosen shoot/project links up front so
  the file is auto-assigned the moment it lands), `confirmUpload`, `listMediaFor`,
  `getDownloadUrl`, `removeMedia`, `assignMedia`, `listUploadTargets`.
- **Direct-to-R2 uploader** (`components/uploads/uploader.tsx`) + **Files lists** on the
  **Shoot drawer** and **Project profile**. The user picks a file; the browser uploads
  straight to R2; the asset appears filed against that shoot/project.
- **Download/view route** `GET /uploads/[id]` → presigned, short-lived URL.

## To connect it (one-off, by Blanc Script — see Settings → Integrations)
Set these env vars on the OS (Vercel → the project): `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Then set the bucket's **CORS** to
allow `PUT`/`GET` from the app origin. Until then the UI shows "storage not connected".

## What Aniro should build (the automation layer)
1. **Capture app / mobile upload** — a lightweight capture surface (PWA or native) where a
   filmer, at the end of a shoot, selects the shoot (defaulting to today's / their assigned
   shoot) and uploads straight from the device. It should call the same
   `createUploadTarget` contract (presigned PUT) so assets land already assigned. Support
   background/resumable uploads for large video (multipart → R2).
2. **Auto-assignment rules** — infer the shoot when possible so the filmer doesn't pick:
   - by the user's **assigned shoot** for that day (they're on the call sheet / `shoot_talent` or crew),
   - by **capture time** vs the shoot's `scheduled_at`,
   - by device/folder convention. Fall back to a quick picker.
3. **Post-processing** — on `status = uploaded`, generate: a **thumbnail/poster**, a
   **proxy/preview** (lower-res for in-app review), and extract **duration/width/height**
   (write back to `media_assets`), then set `status = ready`. (Cloudflare Stream or a worker
   + ffmpeg.)
4. **Edit handoff** — when a `deliverable` enters review, surface its linked assets for the
   review player (ties into the Edits version history + comments already built; frame-accurate
   comments can use `review_comments.timecode_seconds`).
5. **Optional provider mirrors** — if the team wants a copy in **Google Drive** or review in
   **Frame.io**, add them as extra adapters behind the same interface; the registry row stays
   the source of truth, with `storage_provider` per asset.

## Guardrails
- Keep every asset `org_id`-scoped and signed-URL only (no public buckets).
- Never widen the upload contract to bypass auth — uploads go through `createUploadTarget`
  (which runs `requireUser()` and scopes to the org).
- Large files: presign + multipart; never proxy bytes through the app server.

## Related
- Social scheduling (Metricool) for Content is separate — see the content calendar + the
  Metricool/Aniro integration notes. Content items can reference a `media_assets` row as
  their asset for scheduling.
