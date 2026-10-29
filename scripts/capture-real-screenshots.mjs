import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\HP\\AppData\\Local\\Temp\\edge_profile_" + Date.now();

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function capture() {
  console.log('Launching Edge...');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA}`,
    '--window-size=1280,820',
    'about:blank',
  ]);

  await sleep(2000);

  let targets;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch {}
    await sleep(500);
  }

  if (!targets || targets.length === 0) {
    console.error('No targets found');
    edge.kill();
    return;
  }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  console.log('Connecting to WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pending = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  await new Promise((resolve) => ws.on('open', resolve));

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');

  // 1. Landing Page Screenshot
  console.log('Capturing Landing Page (http://localhost:3000)...');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await sleep(2500);
  const shot1 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (shot1.result?.data) {
    fs.writeFileSync('docs/screenshots/01-landing-hero.jpg', Buffer.from(shot1.result.data, 'base64'));
    console.log('Saved docs/screenshots/01-landing-hero.jpg');
  }

  // 2. ProofBench Suite Screenshot
  console.log('Capturing ProofBench (http://localhost:3000/proofbench)...');
  await send('Page.navigate', { url: 'http://localhost:3000/proofbench' });
  await sleep(2000);
  const shot3 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (shot3.result?.data) {
    fs.writeFileSync('docs/screenshots/03-proofbench-suite.jpg', Buffer.from(shot3.result.data, 'base64'));
    console.log('Saved docs/screenshots/03-proofbench-suite.jpg');
  }

  // 3. Scan an issue on Landing Page to capture TraceMap
  console.log('Navigating to landing page to perform scan...');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await sleep(1500);

  // Click the quick scan button for React #1000
  console.log('Clicking quick scan button...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const reactBtn = buttons.find(b => b.textContent && b.textContent.includes('React #1000'));
      if (reactBtn) { reactBtn.click(); }
      const scanBtn = buttons.find(b => b.textContent && b.textContent.includes('Scan Issue'));
      if (scanBtn) { scanBtn.click(); }
    `
  });

  // Wait for scan to complete and TraceMap to render
  console.log('Waiting for scan analysis and TraceMap...');
  await sleep(6000);

  const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (shot2.result?.data) {
    fs.writeFileSync('docs/screenshots/02-tracemap-results.jpg', Buffer.from(shot2.result.data, 'base64'));
    console.log('Saved docs/screenshots/02-tracemap-results.jpg');
  }

  ws.close();
  edge.kill();
  console.log('All real UI screenshots captured successfully!');
}

capture().catch((e) => console.error(e));
