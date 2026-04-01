# Print Kiosk

A self-service print station for public libraries. Patrons upload documents from a touch screen or their phone, choose print settings, and submit to a queue. Staff review, print, and collect payment from a separate dashboard. Documents are private and are not kept after printing.

Built for [Gibson Memorial Library](https://www.creston.lib.ia.us/) in Creston, Iowa.

## How It Works

```
Patron (kiosk/phone)  ──▶  Server  ◀──  Staff (browser)
   Upload document          Queue       Review & print
   Choose settings          SQLite      Collect payment
   Get ticket number        Cleanup     Manage printers
```

**Patrons** use a touch screen kiosk to upload a document from a USB drive or their phone via QR code. They pick color/B&W, single or double-sided, number of copies, and page range. The kiosk gives them a ticket number.

**Staff** open a dashboard in any browser on the same network. Jobs appear in real time with sound alerts. Staff review the document preview, hit Print (which sends it directly to the printer from the server), collect payment, and mark it as paid. Once both printed and paid, the document is securely deleted.

**Documents never leave the server.** Files are not downloaded to the staff device. They are overwritten with zeros and deleted after printing or after a configurable timeout.

## Features

- **Touch-friendly kiosk UI** — 72px+ buttons, large text, designed for patrons aged 50-80
- **Phone upload via QR code** — no app install needed, works in any phone browser
- **USB file browser** — browse connected USB drives, preview files before printing
- **Real-time queue** — Socket.IO pushes new jobs to staff instantly with sound alerts
- **Server-side printing** — `lp` command handles copies, color mode, duplex, and page range
- **Printer management** — auto-discovers CUPS printers, supports manual IPP network printers, test page printing
- **Secure file lifecycle** — zero-fill overwrite + unlink after printing or configurable timeout
- **PDF thumbnails** — up to 20 page previews generated server-side via `pdftoppm`
- **Document conversion** — LibreOffice headless converts DOCX, DOC, PNG, and JPG to PDF
- **Configurable pricing** — staff sets B&W and color per-page rates
- **Daily ticket reset** — ticket numbers optionally start at #001 each day
- **Kiosk mode** — Electron app locks down the screen, blocks Alt+Tab/Ctrl+W/etc, PIN required to exit
- **First-run setup wizard** — network configuration, optional static IP (via nmcli), kiosk exit PIN
- **Staff/kiosk switching** — staff can unlock the kiosk with a PIN to manage settings, then return to kiosk mode
- **Inactivity timer** — kiosk resets to the welcome screen after idle timeout
- **Job rejection** — staff can reject jobs with a reason visible to the queue
- **Flatpak support** — commands wrapped with `flatpak-spawn --host` when running inside a Flatpak sandbox

## Stack

| Layer | Technology |
|-------|-----------|
| Kiosk | Electron 28, Expo 54, React Native 0.81, React 19, Tamagui 1.144, Zustand 5 |
| Staff | Expo 54 (web export served from server), same UI stack as kiosk |
| Server | Bun, Express, Socket.IO (msgpack), SQLite (WAL mode) |
| Printing | CUPS (`lp` / `lpstat`) |
| Conversion | LibreOffice headless |
| Thumbnails | poppler-utils (`pdftoppm`), ImageMagick (`convert`) |
| Fonts | Google Sans Flex |
| Icons | Ionicons |

## Project Structure

```
print-kiosk/
├── apps/
│   ├── patron/          Kiosk client (Expo web + Electron desktop)
│   │   └── electron/    Electron main process (server management, kiosk lock, first-run setup)
│   ├── staff/           Staff dashboard (Expo web, served from server)
│   └── shared/          Shared types, constants, utilities
├── server/              Bun server (Express + SQLite + Socket.IO)
└── scripts/             Build and packaging scripts (copy-server, after-pack, download-bun)
```

## Quick Start

**Prerequisites:** Bun, Node.js 18+, LibreOffice, poppler-utils, CUPS, ImageMagick

```bash
# Install dependencies
npm install                                        # root (concurrently)
cd server && bun install && cd ..                  # server
cd apps/patron && npm install --legacy-peer-deps && cd ../..  # patron
cd apps/staff && npm install --legacy-peer-deps && cd ../..   # staff

# Start everything (server + both web clients)
bun run dev
```

| Service | URL |
|---------|-----|
| Server API | http://localhost:3000 |
| Staff dashboard | http://localhost:3000 (served from server) |
| Patron kiosk (web dev) | http://localhost:8095 |
| Staff dashboard (web dev) | http://localhost:8096 |
| Phone upload page | http://localhost:3000/phone-upload/ |

In development, the staff app runs as a separate Expo dev server on port 8096. In production, the staff web export is served as static files from the server at the root URL.

## Building

### Desktop Kiosk (Electron)

The Electron build bundles the patron app, staff web export, server code, and a platform-specific Bun binary into a single installable package. On launch, the Electron app starts the bundled server and enters kiosk mode.

```bash
# Linux Flatpak
cd apps/patron && npm run build:desktop:linux

# Windows installer
cd apps/patron && npm run build:desktop:win
```

The build process runs automatically: Expo web export (patron + staff) → copy server files → download Bun binary → compile Electron → package with electron-builder.

### Staff Dashboard (Production)

No separate build needed. The server serves the staff web export at its root URL. Build the staff web bundle with:

```bash
cd apps/staff && npm run build:web
```

Then point the server's `STAFF_WEB_DIR` environment variable at the output (defaults to `apps/staff/dist/web`).

## Deployment

The intended deployment is a **Linux mini PC** running the Electron kiosk app. This single machine runs:

1. The **server** (started automatically by Electron)
2. The **patron kiosk UI** (fullscreen Electron window)
3. The **staff dashboard** (served over LAN from the server)

Staff access the dashboard by opening the server's URL in a browser on any device on the same network. The first-run setup wizard can configure a static IP so the staff URL stays consistent.

## Configuration

All settings are managed from the staff dashboard:

- **Pricing** — B&W and color per-page rates (cents)
- **Printers** — select from discovered CUPS printers or add network printers by IPP URL
- **Job timeout** — auto-delete unclaimed jobs (default 30 minutes)
- **Ticket reset** — optionally reset ticket numbers daily
- **Server address** — LAN IP used for phone upload QR codes (auto-detected or set via static IP during first-run)
- **Staff PIN** — protect staff-only actions (print, reject, delete, settings)

## Architecture Notes

- The server is the only machine that holds patron documents. Files are stored temporarily with UUID filenames in a configurable temp directory.
- All printing goes through the server via `lp -d {printer}`. The staff client never downloads or touches the actual document.
- Phone upload works over the library's WiFi — the server detects its LAN IP and generates QR codes with the correct address. A static IP can be configured during first-run setup.
- The kiosk polls `localhost:3000/health` on startup to confirm the co-located server is ready before showing the patron UI.
- SQLite uses WAL mode with periodic checkpoints for reliability.
- Ticket numbers are derived from data (MAX of jobs + history tables), not a separate sequence — crash-safe and restart-safe.
- Thumbnails are generated asynchronously after file upload (up to 20 pages) and cached on disk.
- In a Flatpak environment, system commands (`lp`, `lpstat`, `libreoffice`, `nmcli`, etc.) are run on the host via `flatpak-spawn --host`.

## License

MIT
