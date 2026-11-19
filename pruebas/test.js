/* Prueba la app en Chrome real.
   Uso: node pruebas/test.js [URL]   (por defecto http://localhost:8778/)
   Necesita playwright-core (NODE_PATH) y Chrome instalado. */
const { chromium } = require('playwright-core');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:8778/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CAP = path.join(__dirname, 'capturas');
let ok = 0, mal = 0;
function comprueba(cond, txt) { if (cond) { ok++; } else { mal++; console.log('  ✗ ' + txt); } }

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', e => errores.push(String(e)));
  p.on('response', r => { if (r.status() >= 400) errores.push(r.status() + ' ' + r.url()); });
  p.on('dialog', d => d.accept());

  await p.goto(URL);
  comprueba(await p.isVisible('#pVacio'), 'sin clase se ve la bienvenida');
  await p.screenshot({ path: path.join(CAP, '0-bienvenida.png') });

  // alta de la clase
  await p.click('#bEmpezar');
  await p.fill('#aClase', '2.º B · Montepinar');
  const nombres = ['Lucía', 'Hugo', 'Martina', 'Leo', '<img src=x onerror="window.__xss=1">', 'Lucía'];
  await p.fill('#aNinos', nombres.join('\n'));
  await p.click('#aGuardar');
  await p.waitForTimeout(200);
  comprueba(await p.locator('.nino').count() === 5, 'cinco tarjetas (duplicado quitado)');
  comprueba((await p.textContent('#titulo')) === '2.º B · Montepinar', 'título de la clase');
  const ceros = await p.$$eval('.cuenta b', bs => bs.map(x => x.textContent));
  comprueba(ceros.every(x => x === '0'), 'todos empiezan a 0');
  comprueba(await p.evaluate(() => !window.__xss), 'el nombre con código no se ejecuta');
  comprueba(await p.locator('.nombre', { hasText: '<img' }).count() === 1, 'el nombre raro se pinta como texto');

  // dar tres corazones a Lucía
  const lucia = () => p.locator('.nino').nth(0);
  for (let i = 0; i < 3; i++) { await lucia().locator('.poner').click(); await p.waitForTimeout(120); }
  comprueba((await lucia().locator('.cuenta b').textContent()) === '3', 'Lucía tiene 3');
  comprueba(await p.evaluate(() => document.getElementById('celebra').classList.contains('ver')), 'sale la celebración');
  comprueba((await p.textContent('#celTxt')).includes('Lucía'), 'la celebración dice el nombre');
  comprueba((await p.textContent('#celSub')).includes('3'), 'la celebración dice cuántos lleva');
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(CAP, '1-celebracion.png') });
  // pulsar la tarjeta también da corazón
  await p.locator('.nino').nth(1).locator('.dar').click();
  comprueba((await p.locator('.nino').nth(1).locator('.cuenta b').textContent()) === '1', 'pulsar la tarjeta de Hugo le da 1');
  comprueba((await p.textContent('#resumen b')) === '4', 'resumen: 4 repartidos');

  // quitar
  await lucia().locator('.quitar').click();
  comprueba((await lucia().locator('.cuenta b').textContent()) === '2', 'quitar deja a Lucía en 2');
  comprueba(await p.locator('.nino').nth(2).locator('.quitar').isDisabled(), 'no se puede quitar con 0');
  await p.waitForTimeout(2300);
  await p.screenshot({ path: path.join(CAP, '2-hoy.png') });

  // recarga: se conserva
  await p.reload();
  comprueba((await lucia().locator('.cuenta b').textContent()) === '2', 'tras recargar Lucía sigue con 2');

  // renombrar conserva el historial
  await p.click('#bAjustes');
  await p.fill('#aNinos', ['Lucía', 'Hugo', 'Martina', 'Leo', 'Paula'].join('\n'));
  await p.click('#aGuardar');
  await p.waitForTimeout(150);
  comprueba((await lucia().locator('.cuenta b').textContent()) === '2', 'editar la lista no borra los corazones');
  comprueba(await p.locator('.nino').count() === 5, 'lista editada: 5');

  // semana
  await p.click('#vSemana');
  const fila = await p.$$eval('#tabla tbody tr:first-child td', tds => tds.map(t => t.textContent));
  comprueba(fila[0] === 'Lucía' && fila[fila.length - 1] === '2', 'semana: total de Lucía = 2');
  await p.screenshot({ path: path.join(CAP, '3-semana.png') });
  await p.click('#vHoy');

  // día siguiente: todos a 0, el total se conserva
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errores.push(String(e)));
  await p2.addInitScript(() => {
    const D = Date, mas = 86400000;
    class F extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + mas); } static now() { return D.now() + mas; } }
    window.Date = F;
  });
  await p2.goto(URL);
  const c2 = await p2.$$eval('.cuenta b', bs => bs.map(x => x.textContent));
  comprueba(c2.every(x => x === '0'), 'al día siguiente todos vuelven a 0');
  await p2.click('#vSemana');
  // si mañana es lunes, la semana cambia: ir a la anterior
  const tot = await p2.$$eval('#tabla tbody tr:first-child td', tds => tds[tds.length - 1].textContent);
  comprueba(tot === '2', 'el total acumulado se conserva al cambiar de día');
  await p2.close();

  // poner hoy a 0
  await p.click('#bAjustes');
  await p.click('#aCero');
  await p.waitForTimeout(150);
  const c3 = await p.$$eval('.cuenta b', bs => bs.map(x => x.textContent));
  comprueba(c3.every(x => x === '0'), 'poner hoy a 0 funciona');

  // móvil
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pm = await m.newPage();
  pm.on('pageerror', e => errores.push(String(e)));
  await pm.goto(URL);
  await pm.evaluate(() => localStorage.setItem('corazones-clase-v1', JSON.stringify({ clase: '2.º B', sonido: true, dias: {},
    ninos: ['Lucía','Hugo','Martina','Leo','Paula','Valentina','Mateo','Daniela'].map((n, i) => ({ id: 'n' + i, nombre: n, color: ['#ff385c','#ff8a00','#00a699','#7b61ff'][i % 4] })) })));
  await pm.reload();
  await pm.locator('.nino').nth(2).locator('.poner').tap();
  await pm.waitForTimeout(2400);
  const ancho = await pm.evaluate(() => document.documentElement.scrollWidth);
  comprueba(ancho <= 390, 'en el móvil no hay scroll horizontal (' + ancho + ')');
  await pm.screenshot({ path: path.join(CAP, '4-movil.png') });
  await m.close();

  comprueba(errores.length === 0, 'sin errores de consola ni respuestas ≥400: ' + errores.join(' | '));
  await b.close();
  console.log(`\n${ok} bien, ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
