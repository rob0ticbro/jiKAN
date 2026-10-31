# HOUR 1.0.0

HOUR is an offline flip clock and focus timer with a standalone browser version and an Electron desktop app.

## What's included

- Mechanical clock, countdown timer, and Pomodoro work/break cycles
- Fourteen built-in themes and locally saved custom themes
- Create and edit custom color themes with the built-in theme editor
- 12- or 24-hour clock display
- Optional bouncing screensaver that preserves the active display mode
- Fullscreen display, keyboard controls, and local preferences
- Dependency-free HTML, CSS, and JavaScript frontend; no remote assets or runtime network services

## Linux download

Download **`HOUR-1.0.0-x86_64.AppImage`** from the GitHub Release assets. The AppImage is the manually tested Electron build for 64-bit x86 Linux. The source archive is provided by GitHub from the matching `v1.0.0` tag.

This build was packaged with Electron 45.2.1 and electron-builder 26.18.0 using `npm run app:build`. The app uses Chromium's normal hardware-acceleration selection and requests GPU rasterization when available. Performance depends on the host operating system, graphics driver, and display.

AppImage compatibility has not been verified across Linux distributions. FUSE 2 compatibility may be needed to launch it on some systems; host glibc and graphics drivers can also affect compatibility. See `README.md` for install and build instructions.
