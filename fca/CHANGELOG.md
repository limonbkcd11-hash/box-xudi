
# Changelog

All notable changes to HRIDOY-FCA will be documented in this file.

## [2.2.6] - 2026-07-24

### Fixed
- `listenMqtt`: incoming message-reaction detection (`type: "message_reaction"`) could silently stop working (and take reply/unsend detection down with it) if any single MQTT delta had a missing/unexpected field (e.g. `threadKey`, `senderId`, `userId`), because one thrown error inside the ClientPayload delta loop was never caught. Each delta in the loop is now processed inside its own try/catch, and reaction/unsend fields are read defensively instead of assuming they always exist, so a single bad delta is logged and skipped instead of breaking reaction detection for the rest of the session.

## [2.0.0] - 2026-07-19

### Changed
- Rebranded package from ST-FCA/stfca to HRIDOY-FCA/hridoy-fca (package.json, README, all source headers)
- Auto-update system now checks the `hridoy-fca` npm package/repo instead of the original author's

### Removed / Fixed
- Removed a background routine that silently fetched image-upload API keys from the original author's GitHub repo and used them to upload user images to that author's ImgBB/ImageKit accounts. Image upload keys are now read only from your own `config.json` (`imgKeys`), or omitted if not set.
- Fixed a syntax bug in `checkUpdate.js` (`packageJson.dependencies.hridoy-fca` is invalid JS for a hyphenated key — switched to bracket notation) that would have thrown at runtime during update checks.

## [1.0.5] - 2025-01-13

### Added
- 🔄 Comprehensive update system that properly syncs all files
- 📂 Automatic file tree comparison between local and GitHub
- ➕ Smart file addition for new files in updates
- ♻️ Automatic modification detection and update
- 🗑️ Automatic deletion of removed files from old versions
- 🎯 No backup folder creation - cleaner updates

### Changed
- Improved update mechanism to handle version jumps (e.g., 1.0.3 → 1.0.6)
- Enhanced file synchronization to ensure no missing files
- Better error handling during updates
- Auto-restart after successful update

### Fixed
- Missing files when updating across multiple versions
- Outdated files not being properly replaced
- Orphaned files from old versions not being cleaned up

## [1.0.4] - 2025-01-13

### Added
- 🔄 Automatic update checking on package initialization
- ⚡ Non-blocking update process - doesn't interrupt user's bot startup
- 🎯 Update check runs once per session to avoid redundant checks
- 💡 Silent error handling for update checks

### Changed
- Update checker now integrated directly into login flow
- Improved user experience with seamless auto-updates

## [1.0.3] - 2025-01-13

### Added
- 🎨 Enhanced MQTT connection logging with visual indicators
- 🔄 Auto-reconnect status display
- 📊 Connection region display
- ⚡ Automatic update checking and installation
- 💾 Automatic backup creation before updates
- 🎯 Better error messages and debugging
- 📋 Changelog tracking
- 🌟 Branding: "Maintained & Enhanced by HRIDOY"

### Changed
- Improved console output with colors and formatting
- Better connection status messages
- Enhanced stability and error handling

### Fixed
- MQTT reconnection reliability
- Connection timeout handling
- Error message clarity

---

**Maintained & Enhanced by HRIDOY**  
GitHub: https://github.com/hridoy-dev/HRIDOY-FCA  
NPM: https://www.npmjs.com/package/hridoy-fca
