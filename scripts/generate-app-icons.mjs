import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "android-app", "assets");

const leaf = `
  <path d="M220 804C220 430 438 212 804 180c0 405-234 624-560 624" fill="#9DB8A6"/>
  <path d="M220 804c124-202 296-374 499-482" stroke="#0F2A20" stroke-width="48" stroke-linecap="round" fill="none" opacity=".78"/>
`;

const icon = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="220" fill="#0F2A20"/>
  ${leaf}
</svg>`;

const foreground = `<svg width="512" height="512" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${leaf}
</svg>`;

const background = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0F2A20"/>
</svg>`;

const monochrome = `<svg width="432" height="432" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path d="M220 804C220 430 438 212 804 180c0 405-234 624-560 624" fill="#FFFFFF"/>
  <path d="M220 804c124-202 296-374 499-482" stroke="#000000" stroke-width="48" stroke-linecap="round" fill="none" opacity=".55"/>
</svg>`;

const splash = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(242 242) scale(.53)">${leaf}</g>
</svg>`;

await Promise.all([
  sharp(Buffer.from(icon)).png().toFile(path.join(assets, "green-room-icon.png")),
  sharp(Buffer.from(foreground)).png().toFile(path.join(assets, "green-room-foreground.png")),
  sharp(Buffer.from(background)).png().toFile(path.join(assets, "green-room-background.png")),
  sharp(Buffer.from(monochrome)).png().toFile(path.join(assets, "green-room-monochrome.png")),
  sharp(Buffer.from(icon)).resize(48, 48).png().toFile(path.join(assets, "green-room-favicon.png")),
  sharp(Buffer.from(splash)).png().toFile(path.join(assets, "green-room-splash.png")),
]);

console.log("Generated Green Room app icon set in", assets);
