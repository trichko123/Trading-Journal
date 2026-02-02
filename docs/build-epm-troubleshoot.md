# Build Troubleshooting: esbuild spawn EPERM (Windows)

## Exact error text
```
esbuild spawn EPERM while loading vite.config.js
```

## Most likely causes on Windows
- Antivirus or EDR temporarily locks `node_modules/esbuild` or the `esbuild.exe` binary during launch.
- Windows permissions / Controlled Folder Access blocks executing the esbuild binary.
- `esbuild.exe` (or related file) is locked by another process (stale watcher, previous build, editor).
- Path length or special characters in the project path trigger Windows execution restrictions.
- OneDrive / network / synced folders introduce file locks or execution restrictions.

## Safe remediation steps (in order)
Most likely fix path (3 steps):
1) Delete Vite cache:
   - `frontend/trading-journal-ui/node_modules/.vite`
2) Rebuild esbuild binary:
   - `npm rebuild esbuild`
3) Clean reinstall:
   - Delete `frontend/trading-journal-ui/node_modules`
   - Delete `frontend/trading-journal-ui/package-lock.json`
   - Run `npm install`

Additional safe steps:
4) Close editors/terminals that might be using the repo, then retry:
   - `npm run build`
5) Move the project to a short, local path (avoid OneDrive):
   - Example: `C:\dev\trading-journal`
6) Add an AV/EDR exclusion for the repo and `node_modules`, then retry:
   - Ensure Controlled Folder Access allows the repo folder.

## Repo notes (this workspace)
- Current path is `D:\ProjectsPorfolio\trading-journal` (local disk, not OneDrive).
- Path length is normal and contains no special characters.
- Frontend uses Vite `^7.2.4` with `@vitejs/plugin-react` `^5.1.1` (esbuild is a transitive dependency).

## Minimal verification checklist
- `npm run build` completes successfully.
- No `EPERM` errors are emitted during Vite config load or esbuild spawn.

## Optional repo-level cause to check (do not apply yet)
If the issue persists across clean reinstalls, check that the frontend uses a supported Node version and that the package manager lockfile is consistent. A minimal, optional change would be to add an `engines` field in `frontend/trading-journal-ui/package.json` to pin a known-good Node version for Vite/esbuild on Windows. This should only be done after confirming your current Node version is outside the supported range.
