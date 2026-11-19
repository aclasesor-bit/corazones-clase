const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'docs', 'icono.svg'), 'utf8');
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const p = await b.newPage();
  for (const s of [180, 192, 512]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'docs', `icono-${s}.png`), omitBackground: true });
  }
  await b.close(); console.log('iconos ok');
})();
