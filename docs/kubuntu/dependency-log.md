# Dependency log

Freshness rule: only stable versions published on or before **cutoff = selection date − 14 days** are used. Selection date **2026-10-05**, cutoff **2026-09-21** (inclusive). Publish dates read from `registry.npmjs.org` (`time` field of each packument), verified 2026-10-05 by `scripts/verify-dep-freshness.js`. Installs used `--before=2026-09-21` so transitive resolutions obey the same cutoff.

## Selections

| Package | From | To | Published | Why |
|---|---|---|---|---|
| electron | 30.5.1 | 44.4.3 | 2026-09-18 | Supported line (44 stable 2026-08-25, EOL 2027-03-02). 44.4.4 to 44.5.1 were published after the cutoff and are not used |
| electron-builder | 24.13.3 | 26.16.1 | 2026-09-07 | Current 26.x on or before cutoff (26.17.0 published 2026-09-26, not used) |
| @types/node | 20.19.41 | 24.13.6 | 2026-09-19 | Electron 44 bundles Node 24 (24.18.1) |
| fast-uri (transitive) | 3.1.2 | 3.1.8 | 2026-09-15 | Fixes the high-severity URI parsing advisories in shipped code. Approved by you 2026-10-05 as a fourth change |
| @electron/windows-sign (override, transitive) | 1.2.2 | 1.0.0 | 2023-11-01 | Only version without a `postject` dependency; see below |

## Exceptions

| Package | Version | Problem | Resolution |
|---|---|---|---|
| postject | 1.0.0-alpha.6 | Prerelease with no stable release, optional dev-only transitive of `@electron/windows-sign` | **Removed**, at your request 2026-10-05, with `overrides: { "electron-winstaller": { "@electron/windows-sign": "1.0.0" } }` in `package.json`. `@electron/windows-sign` is only used by electron-builder's Squirrel.Windows target, which this project does not build (NSIS and deb only). Windows packaging, the asar guard and the Linux build were rerun and pass. If a future electron-builder starts to need windows-sign for NSIS, drop the override and raise it again |

## Full list of added or changed packages (generated)

Freshness check against baseline `win-baseline-1.0.0`; cutoff 2026-09-21 (inclusive); verified 2026-10-05 via registry.npmjs.org.
104 added or changed package versions; 0 failing.

| Package | From | To | Scope | Published | Source | Status |
|---|---|---|---|---|---|---|
| @electron-internal/extract-zip | (new) | 1.0.5 | dev | 2026-07-29 | https://registry.npmjs.org/@electron-internal%2Fextract-zip | ok |
| @electron/fuses | (new) | 1.8.0 | dev | 2024-03-25 | https://registry.npmjs.org/@electron%2Ffuses | ok |
| @electron/get | 2.0.3 | 5.1.0 | dev | 2026-07-27 | https://registry.npmjs.org/@electron%2Fget | ok |
| @electron/get | (new) | 3.1.0 | dev | 2024-07-15 | https://registry.npmjs.org/@electron%2Fget | ok |
| @electron/notarize | 2.2.1 | 2.5.0 | dev | 2024-09-17 | https://registry.npmjs.org/@electron%2Fnotarize | ok |
| @electron/osx-sign | 1.0.5 | 1.3.3 | dev | 2025-03-05 | https://registry.npmjs.org/@electron%2Fosx-sign | ok |
| @electron/rebuild | (new) | 4.2.0 | dev | 2026-07-07 | https://registry.npmjs.org/@electron%2Frebuild | ok |
| @electron/universal | 1.5.1 | 2.0.3 | dev | 2025-05-02 | https://registry.npmjs.org/@electron%2Funiversal | ok |
| @electron/windows-sign | (new) | 1.0.0 | dev | 2023-11-01 | https://registry.npmjs.org/@electron%2Fwindows-sign | ok |
| @isaacs/fs-minipass | (new) | 4.0.1 | dev | 2024-04-18 | https://registry.npmjs.org/@isaacs%2Ffs-minipass | ok |
| @malept/cross-spawn-promise | 1.1.1 | 2.0.0 | dev | 2021-07-02 | https://registry.npmjs.org/@malept%2Fcross-spawn-promise | ok |
| @noble/hashes | (new) | 1.8.0 | dev | 2025-04-21 | https://registry.npmjs.org/@noble%2Fhashes | ok |
| @peculiar/asn1-schema | (new) | 2.9.5 | dev | 2026-09-20 | https://registry.npmjs.org/@peculiar%2Fasn1-schema | ok |
| @peculiar/json-schema | (new) | 1.1.12 | dev | 2020-07-22 | https://registry.npmjs.org/@peculiar%2Fjson-schema | ok |
| @peculiar/utils | (new) | 2.0.3 | dev | 2026-05-01 | https://registry.npmjs.org/@peculiar%2Futils | ok |
| @peculiar/webcrypto | (new) | 1.7.1 | dev | 2026-05-01 | https://registry.npmjs.org/@peculiar%2Fwebcrypto | ok |
| @types/node | 20.19.41 | 24.13.6 | dev | 2026-09-19 | https://registry.npmjs.org/@types%2Fnode | ok |
| @xmldom/xmldom | 0.9.10 | 0.8.15 | dev | 2026-08-21 | https://registry.npmjs.org/@xmldom%2Fxmldom | ok |
| abbrev | (new) | 4.0.0 | dev | 2025-10-20 | https://registry.npmjs.org/abbrev | ok |
| agent-base | 6.0.2 | 7.1.4 | dev | 2025-07-07 | https://registry.npmjs.org/agent-base | ok |
| ajv | (new) | 8.20.0 | dev | 2026-04-24 | https://registry.npmjs.org/ajv | ok |
| app-builder-lib | 24.13.3 | 26.16.1 | dev | 2026-09-07 | https://registry.npmjs.org/app-builder-lib | ok |
| asn1js | (new) | 3.0.10 | dev | 2026-04-20 | https://registry.npmjs.org/asn1js | ok |
| aws4 | (new) | 1.13.2 | dev | 2024-08-28 | https://registry.npmjs.org/aws4 | ok |
| balanced-match | (new) | 4.0.4 | dev | 2026-02-22 | https://registry.npmjs.org/balanced-match | ok |
| brace-expansion | 1.1.15 | 1.1.21 | dev | 2026-09-14 | https://registry.npmjs.org/brace-expansion | ok |
| brace-expansion | (new) | 5.0.12 | dev | 2026-09-14 | https://registry.npmjs.org/brace-expansion | ok |
| builder-util | 24.13.1 | 26.16.0 | dev | 2026-09-02 | https://registry.npmjs.org/builder-util | ok |
| builder-util-runtime | 9.2.4 | 9.7.0 | dev | 2026-06-05 | https://registry.npmjs.org/builder-util-runtime | ok |
| bytestreamjs | (new) | 2.0.1 | dev | 2022-09-07 | https://registry.npmjs.org/bytestreamjs | ok |
| chownr | 2.0.0 | 3.0.0 | dev | 2024-04-06 | https://registry.npmjs.org/chownr | ok |
| ci-info | (new) | 4.3.1 | dev | 2025-10-05 | https://registry.npmjs.org/ci-info | ok |
| ci-info | (new) | 4.4.0 | dev | 2026-01-29 | https://registry.npmjs.org/ci-info | ok |
| core-util-is | 1.0.2 | 1.0.3 | dev | 2021-08-31 | https://registry.npmjs.org/core-util-is | ok |
| dir-compare | 3.3.0 | 4.2.0 | dev | 2023-08-20 | https://registry.npmjs.org/dir-compare | ok |
| dmg-builder | 24.13.3 | 26.16.1 | dev | 2026-09-07 | https://registry.npmjs.org/dmg-builder | ok |
| dotenv | 9.0.2 | 16.6.1 | dev | 2025-06-27 | https://registry.npmjs.org/dotenv | ok |
| dotenv-expand | 5.1.0 | 11.0.7 | dev | 2024-11-13 | https://registry.npmjs.org/dotenv-expand | ok |
| duplexer2 | (new) | 0.1.4 | dev | 2015-11-08 | https://registry.npmjs.org/duplexer2 | ok |
| electron | 30.5.1 | 44.4.3 | dev | 2026-09-18 | https://registry.npmjs.org/electron | ok |
| electron-builder | 24.13.3 | 26.16.1 | dev | 2026-09-07 | https://registry.npmjs.org/electron-builder | ok |
| electron-builder-squirrel-windows | 24.13.3 | 26.16.1 | dev | 2026-09-07 | https://registry.npmjs.org/electron-builder-squirrel-windows | ok |
| electron-publish | 24.13.1 | 26.16.0 | dev | 2026-09-02 | https://registry.npmjs.org/electron-publish | ok |
| electron-winstaller | (new) | 5.4.0 | dev | 2024-07-23 | https://registry.npmjs.org/electron-winstaller | ok |
| env-paths | (new) | 3.0.0 | dev | 2021-08-27 | https://registry.npmjs.org/env-paths | ok |
| exponential-backoff | (new) | 3.1.3 | dev | 2025-10-10 | https://registry.npmjs.org/exponential-backoff | ok |
| fast-uri | 3.1.2 | 3.1.8 | prod | 2026-09-15 | https://registry.npmjs.org/fast-uri | ok |
| fdir | (new) | 6.5.0 | dev | 2025-08-14 | https://registry.npmjs.org/fdir | ok |
| form-data | 4.0.5 | 4.0.6 | dev | 2026-06-12 | https://registry.npmjs.org/form-data | ok |
| fs-extra | (new) | 9.1.0 | dev | 2021-01-19 | https://registry.npmjs.org/fs-extra | ok |
| fs-extra | (new) | 8.1.0 | dev | 2019-06-28 | https://registry.npmjs.org/fs-extra | ok |
| fs-extra | (new) | 11.4.0 | dev | 2026-07-23 | https://registry.npmjs.org/fs-extra | ok |
| fs-extra | (new) | 7.0.1 | dev | 2018-11-07 | https://registry.npmjs.org/fs-extra | ok |
| fs-extra | (new) | 11.3.1 | dev | 2025-08-05 | https://registry.npmjs.org/fs-extra | ok |
| hasown | 2.0.3 | 2.0.4 | dev | 2026-05-28 | https://registry.npmjs.org/hasown | ok |
| http-proxy-agent | 5.0.0 | 7.0.2 | dev | 2024-02-15 | https://registry.npmjs.org/http-proxy-agent | ok |
| https-proxy-agent | 5.0.1 | 7.0.6 | dev | 2024-12-07 | https://registry.npmjs.org/https-proxy-agent | ok |
| isexe | (new) | 3.1.5 | dev | 2026-02-09 | https://registry.npmjs.org/isexe | ok |
| isexe | (new) | 4.0.0 | dev | 2026-02-09 | https://registry.npmjs.org/isexe | ok |
| jiti | (new) | 2.7.0 | dev | 2026-05-05 | https://registry.npmjs.org/jiti | ok |
| json-schema-traverse | (new) | 1.0.0 | dev | 2020-12-13 | https://registry.npmjs.org/json-schema-traverse | ok |
| jsonfile | (new) | 4.0.0 | dev | 2017-09-12 | https://registry.npmjs.org/jsonfile | ok |
| jsonfile | (new) | 6.2.1 | dev | 2026-04-20 | https://registry.npmjs.org/jsonfile | ok |
| minimatch | 5.1.9 | 10.2.6 | dev | 2026-07-27 | https://registry.npmjs.org/minimatch | ok |
| minipass | 5.0.0 | 7.1.3 | dev | 2026-02-19 | https://registry.npmjs.org/minipass | ok |
| minizlib | 2.1.2 | 3.1.0 | dev | 2025-09-21 | https://registry.npmjs.org/minizlib | ok |
| mkdirp | 1.0.4 | 0.5.6 | dev | 2022-03-22 | https://registry.npmjs.org/mkdirp | ok |
| node-abi | (new) | 4.35.0 | dev | 2026-08-28 | https://registry.npmjs.org/node-abi | ok |
| node-api-version | (new) | 0.2.1 | dev | 2025-03-22 | https://registry.npmjs.org/node-api-version | ok |
| node-gyp | (new) | 12.4.0 | dev | 2026-06-05 | https://registry.npmjs.org/node-gyp | ok |
| nopt | (new) | 9.0.0 | dev | 2025-10-22 | https://registry.npmjs.org/nopt | ok |
| pe-library | (new) | 0.4.1 | dev | 2024-08-10 | https://registry.npmjs.org/pe-library | ok |
| picomatch | (new) | 4.0.7 | dev | 2026-08-24 | https://registry.npmjs.org/picomatch | ok |
| pkijs | (new) | 3.4.1 | dev | 2026-09-20 | https://registry.npmjs.org/pkijs | ok |
| plist | 3.1.1 | 3.1.0 | dev | 2023-07-06 | https://registry.npmjs.org/plist | ok |
| proc-log | (new) | 6.1.0 | dev | 2025-11-25 | https://registry.npmjs.org/proc-log | ok |
| proper-lockfile | (new) | 4.1.2 | dev | 2021-01-25 | https://registry.npmjs.org/proper-lockfile | ok |
| pvtsutils | (new) | 1.3.6 | dev | 2024-11-22 | https://registry.npmjs.org/pvtsutils | ok |
| pvutils | (new) | 1.2.0 | dev | 2026-08-05 | https://registry.npmjs.org/pvutils | ok |
| read-binary-file-arch | (new) | 1.0.6 | dev | 2023-12-04 | https://registry.npmjs.org/read-binary-file-arch | ok |
| readable-stream | 3.6.2 | 2.3.8 | dev | 2023-02-23 | https://registry.npmjs.org/readable-stream | ok |
| resedit | (new) | 1.7.2 | dev | 2024-10-08 | https://registry.npmjs.org/resedit | ok |
| rimraf | (new) | 2.6.3 | dev | 2019-01-02 | https://registry.npmjs.org/rimraf | ok |
| safe-buffer | (new) | 5.1.2 | dev | 2018-04-25 | https://registry.npmjs.org/safe-buffer | ok |
| sax | 1.6.0 | 1.6.1 | dev | 2026-07-24 | https://registry.npmjs.org/sax | ok |
| semver | (new) | 6.3.1 | dev | 2023-07-10 | https://registry.npmjs.org/semver | ok |
| semver | (new) | 7.7.4 | dev | 2026-02-05 | https://registry.npmjs.org/semver | ok |
| semver | (new) | 5.7.2 | dev | 2023-07-10 | https://registry.npmjs.org/semver | ok |
| string_decoder | 1.3.0 | 1.1.1 | dev | 2018-03-30 | https://registry.npmjs.org/string_decoder | ok |
| tar | 6.2.1 | 7.5.22 | dev | 2026-07-24 | https://registry.npmjs.org/tar | ok |
| temp | (new) | 0.9.4 | dev | 2020-11-10 | https://registry.npmjs.org/temp | ok |
| tiny-async-pool | (new) | 1.3.0 | dev | 2022-03-18 | https://registry.npmjs.org/tiny-async-pool | ok |
| tinyglobby | (new) | 0.2.17 | dev | 2026-05-30 | https://registry.npmjs.org/tinyglobby | ok |
| tmp | 0.2.5 | 0.2.7 | dev | 2026-05-27 | https://registry.npmjs.org/tmp | ok |
| undici | (new) | 6.28.1 | dev | 2026-09-04 | https://registry.npmjs.org/undici | ok |
| undici | (new) | 7.29.1 | dev | 2026-09-04 | https://registry.npmjs.org/undici | ok |
| undici-types | 6.21.0 | 7.18.2 | dev | 2026-01-06 | https://registry.npmjs.org/undici-types | ok |
| universalify | (new) | 0.1.2 | dev | 2018-06-20 | https://registry.npmjs.org/universalify | ok |
| universalify | (new) | 2.0.1 | dev | 2023-11-01 | https://registry.npmjs.org/universalify | ok |
| unzipper | (new) | 0.12.5 | dev | 2026-06-21 | https://registry.npmjs.org/unzipper | ok |
| webcrypto-core | (new) | 1.9.2 | dev | 2026-05-01 | https://registry.npmjs.org/webcrypto-core | ok |
| which | (new) | 5.0.0 | dev | 2024-10-01 | https://registry.npmjs.org/which | ok |
| which | (new) | 6.0.1 | dev | 2026-02-10 | https://registry.npmjs.org/which | ok |
| yallist | (new) | 5.0.0 | dev | 2024-04-09 | https://registry.npmjs.org/yallist | ok |
