# Dependency audit

Tool: `npm audit` (GitHub Advisory Database via the npm registry), run 2026-10-05 in the ext4 clone on lockfile states below. Advisory IDs are GitHub advisory IDs. This is not a claim that any package is vulnerability-free; it records what was checked, with what, and when. Audit run 2 below adds OSV.dev and the Chromium check. NVD and Ubuntu Security Notice checks for the `.deb` system libraries are still open (see "Still to do").

## Run 1 results

| Lockfile state | Total | Critical | High | Moderate | Low | Prod only (`--omit=dev`) |
|---|---|---|---|---|---|---|
| Baseline (`win-baseline-1.0.0`, Electron 30.5.1, electron-builder 24.13.3) | 57 | 1 | 54 | 1 | 1 | 1 high |
| After Electron 44.4.3, electron-builder 26.16.1, @types/node 24.13.6 | 44 | 0 | 42 | 1 | 1 | 1 high |

Resolved by the upgrade: the `electron` advisories (runtime, end-of-life 30.x), the critical `tar` advisories (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97), and the build-tool advisories in `app-builder-lib`, `builder-util-runtime`, `@xmldom/xmldom`, `extract-zip`, `form-data` and `tmp`.

## Remaining findings

| Package | Version | Scope | Severity | Advisories (examples) | Fix | Decision |
|---|---|---|---|---|---|---|
| fast-uri | 3.1.2, **updated to 3.1.8 on 2026-10-05** | **Shipped** (via electron-store > conf > ajv@8) and build (electron-builder > app-builder-lib > ajv) | High | GHSA-v2hh-gcrm-f6hx, GHSA-fph4-wmhf-6fwf, GHSA-7p8r-x3mc-p8w7 (host confusion and SSRF in URI parsing; range 3.0.0 to 3.1.7) | 3.1.8, published 2026-09-15 (meets the 14-day rule). Applied as a fourth package change | **Applied (approved).** `npm update fast-uri --before=2026-09-21` gave 3.1.8; typecheck, tests and the Windows asar guard pass (the guard now expects 3.1.8). Reachability before the fix: `conf` validates only local settings, not attacker-controlled URIs; not established as exploitable |
| brace-expansion, braces, browserslist, http-cache-semantics, js-yaml, shell-quote | various | Dev/build only (jest, eslint, electron-builder tooling) | High | see `npm audit` | Mostly majors (jest 30, typescript-eslint 8) | Reported, not upgraded: dev-only, outside the planned three-package change |
| baseline-browser-mapping | <2.11.0 | Dev | Moderate | GHSA-w5vr-8v7q-w6rv | via jest tooling | Reported |
| esbuild | 0.28.0 | Dev (renderer bundling) | Low | GHSA-g7r4-m6w7-qqqr (0.27.3 to 0.28.0) | newer esbuild; check freshness | Reported; dev server not used |

## Observations about the existing design (not changed; they apply to Windows too)

- `sandbox: false` on the main, mini and settings windows (`src/main/windowManager.ts`).
- No `setWindowOpenHandler`, navigation restriction or permission handler on the YouTube Music view.
- Numeric values are interpolated into `executeJavaScript` strings (`src/main/playerBridge.ts`); inputs are clamped or numeric.
- Album-art temp files in the temp directory are never deleted (`src/main/notificationManager.ts`).

## Audit run 2 (2026-10-05, feat/kubuntu lockfile, 630 package versions)

| Source | Result |
|---|---|
| OSV.dev `querybatch` over every name@version in `package-lock.json` | 11 packages have records: `fast-uri@3.1.2` (**shipped**, 4+ advisories) and 10 dev/build-only (`brace-expansion` x2, `js-yaml` x2, `baseline-browser-mapping`, `braces`, `browserslist`, `esbuild`, `http-cache-semantics`, `shell-quote`). Same set as `npm audit`; no new shipped package |
| GitHub Advisory Database, `affects=electron@44.4.3` | none returned |
| Electron release notes, 44.4.4 to 44.5.1 | Each carries Chromium/V8/Dawn/PDFium security updates (44.4.4 on 2026-09-22, 44.4.5 on 09-23, 44.5.0 on 09-29, 44.5.1 on 09-30). They were published after the 2026-09-21 cutoff, so 44.4.3 is the newest version the rule allows today |

**Consequence:** the Chromium inside the Electron binary is not covered by npm advisories. Electron 44.4.3 lacks four later Chromium security drops. They become eligible under the 14-day rule one by one: 44.4.4 on 2026-10-06, 44.4.5 on 10-07, 44.5.0 on 10-13, 44.5.1 on **2026-10-14**. Re-run the selection (section 4.5 of the plan) immediately before building the release candidate and use the then-newest eligible 44.x. That is a repeat of the Windows gate W-A for the new binary.

## Still to do

- NVD/CVE detail lookups for the remaining findings if you want severity scores beyond the GitHub advisory ratings.
- Ubuntu Security Notices for the `.deb` system dependencies (`libnss3`, `libgtk-3-0t64`, `libsecret-1-0`, ...) on the target release; these are updated through apt, not bundled.
- `npm audit signatures`, to be run after the final lockfile is fixed.
- A CI audit job: held until you decide on `fast-uri` and `postject`, because it would fail on the `fast-uri` High until then.
