import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Visually lossless H.264 — the screenshots carry small text.
Config.setCrf(16);
