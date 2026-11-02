# jiKAN 1.3.0

jiKAN is a polished, offline flip clock and focus timer with a standalone browser version and a lightweight Electron desktop app.

## What's new

- Remember the last-used mode and expand keyboard shortcuts and mode-tab navigation
- Add a completion chime, in-app alert, and desktop notification when timers or Pomodoro phases finish
- Track completed timers and Pomodoro work sessions in a local daily focus history, enabled by default and optional
- Export and import custom themes as validated JSON without including other settings
- Replace the ambient-glow checkbox with an accessible animated switch
- Added an About card with version checking and verified in-place AppImage updates
- Added a mouse-responsive, animated About card with a periodic highlight
- Added tactile synthesized UI sounds with a Settings toggle
- Added an optional clock tick sound, off by default
- Updated the app identity and GitHub presentation to **jiKAN** (時計)
- Made **Amber Terminal** the default theme and moved **Obsidian** to the end of the theme carousel
- Refined the Settings drawer with animated custom dropdowns, theme-aware sliders, and cleaner color controls
- Added precise clock-size and accent-glow sliders with responsive track fill
- Smoothed Clock, Timer, and Pomodoro control transitions
- Replaced the browser's number spinners with compact in-field duration controls
- Added a glossy spotlight hover to the jiKAN wordmark and theme navigation
- Added a new jiKAN wordmark icon and refreshed the GitHub project page

## Features

- Mechanical flip clock, countdown timer, and automatic Pomodoro work/break cycles
- Fourteen built-in themes and locally saved custom themes
- 12- or 24-hour local clock display, adjustable clock size, and configurable timer durations
- Optional bouncing screensaver and a digits-only fullscreen display
- Keyboard controls, reduced-motion support, and locally saved preferences
- Offline browser website and Linux desktop app; no runtime network services or remote assets

## Linux AppImage

Download **`jiKAN-1.3.0-x86_64.AppImage`** from the GitHub Release assets, or build it with `npm run app:build`. The AppImage is for 64-bit x86 Linux.

The app uses Chromium's normal hardware-acceleration selection and requests GPU rasterization when available. Performance depends on the host operating system, graphics driver, and display.

AppImage compatibility has not been verified across Linux distributions. FUSE 2 compatibility may be needed to launch it on some systems; host glibc and graphics drivers can also affect compatibility. See `README.md` for build instructions.
