# Dustlings Steam staging

This folder contains the exact verified Windows and Mac payloads from Dustlings 0.5.1-rpg-dev 8196bad7d896, with engine notices. No tests, saves, source checkout or credentials are shipped.

App/depot IDs are missing. Fill a copy of steam-ids.example.json with your actual Steamworks IDs and rerun prepare-steam.mjs into a new folder with --config=that-file. The .vdf.in files are templates, not upload scripts.

Set launch options to Dustlings.exe (Windows) and Dustlings.app (macOS), with OS-restricted depots. Use the Steamworks SDK ContentBuilder to preview the configured scripts and inspect its file manifest. Preview=1 uploads nothing; SetLive is empty. After account/platform/release checks, change Preview to 0 for an intentional upload, then validate an installed private Steam branch and its update/save behavior before assigning a public build.

Windows runtime, actual player feedback, Mac distribution signing/notarization and Valve review remain separate requirements. This is an RPG neighborhood development build.

[SteamPipe documentation](https://partner.steamgames.com/doc/sdk/uploading) · [Release process](https://partner.steamgames.com/doc/store/releasing)
