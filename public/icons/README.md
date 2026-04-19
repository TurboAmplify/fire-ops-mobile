# App Icons

Generated from `src/assets/icon-master.png` (1024×1024 master).

## iOS (`icons/ios/`)
Drop the entire folder into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
(replace existing). `Contents.json` is included.

## Android (`icons/android/`)
Copy each `mipmap-*` folder into `android/app/src/main/res/`
(replace existing). Includes legacy `ic_launcher.png` + `ic_launcher_round.png`,
adaptive-icon foreground/background, and `mipmap-anydpi-v26/ic_launcher.xml`.

## Store Listings (`icons/store/`)
- `appstore-1024.png` — App Store listing
- `playstore-512.png` — Play Store listing
- `feature-graphic-1024x500.png` — Play Store feature graphic

## Web / PWA
Located at the public root: `favicon.ico`, `favicon-16.png`, `favicon-32.png`,
`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`.

## Regenerate
Run `python3 /tmp/gen_icons.py` (script also lives in chat history) to
regenerate all sizes from the master after editing `flame-foreground.png`.
