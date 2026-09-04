---
name: Playwright WebKit audio on Replit
description: Limits of real-time Web Audio tests in the Replit headless WebKit runner.
---

The Nix-packaged Playwright WebKit uses WPE in headless mode. Its browser closure does not expose GStreamer's `autoaudiosink`, so a real-time `AudioContext` reports that it failed to start the audio device even before probing hardware.

**Why:** Hiding this with a mocked context defeats cross-browser regression coverage. Supplying `gst-plugins-good` through `GST_PLUGIN_PATH` lets WebKit create `autoaudiosink`; an ALSA `type null` default then provides the hardware-free CI output.

**How to apply:** On Nix runners, align Playwright with `playwright-driver.browsers`, add GStreamer core/base/good plugin directories to `GST_PLUGIN_PATH`, and point `ALSA_CONFIG_PATH` to a config whose default PCM is `type null`.