interface AppConfig {
  prompt: string;
  messages: { q1: string; q2: string; errorNotStudent: string; noMatch: string };
  hiddenCommands: Record<string, string>;
}

class CtrlCSignal extends Error {}

let term: HTMLElement;
let inp: HTMLInputElement;
let onEnter: ((v: string) => void) | null = null;
let onCtrlC: (() => void) | null = null;
let echoEl: HTMLSpanElement | null = null;
let cursorEl: HTMLSpanElement | null = null;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const sp = (cls: string, text = '') =>
  Object.assign(document.createElement('span'), { className: cls, textContent: text });

const spOrLink = (cls: string, text: string): HTMLElement =>
  /^https?:\/\/\S+$/.test(text)
    ? Object.assign(document.createElement('a'), { href: text, textContent: text, target: '_blank', rel: 'noopener noreferrer', className: cls })
    : sp(cls, text);

function ln(...parts: (HTMLElement | string)[]): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'line';
  for (const p of parts) d.append(typeof p === 'string' ? sp('c-text', p) : p);
  term.append(d);
  term.scrollTop = term.scrollHeight;
  return d;
}

const blank = () => ln(sp('', '\u00a0'));

async function type(el: HTMLElement, text: string, ms = 70) {
  for (const ch of text) { el.textContent += ch; await sleep(ms); }
}

function initInput() {
  inp = document.createElement('input');
  inp.type = 'text';
  inp.setAttribute('autocomplete', 'off');
  inp.setAttribute('autocorrect', 'off');
  inp.setAttribute('autocapitalize', 'off');
  inp.setAttribute('spellcheck', 'false');
  inp.style.cssText = 'position:fixed;top:-200px;left:0;opacity:0;width:300px;height:1px;pointer-events:none;';
  document.body.append(inp);
  const syncEcho = () => { if (echoEl) echoEl.textContent = inp.value; };
  inp.addEventListener('input', syncEcho);
  inp.addEventListener('compositionend', syncEcho);
  inp.addEventListener('keyup', syncEcho);
  inp.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'c' && !window.getSelection()?.toString()) {
      e.preventDefault();
      if (echoEl) echoEl.textContent += '^C';
      cursorEl?.remove(); cursorEl = echoEl = null;
      inp.value = ''; onEnter = null;
      const cb = onCtrlC; onCtrlC = null;
      cb?.();
      return;
    }
    if (e.key !== 'Enter' || !onEnter) return;
    if (e.isComposing) return;
    e.preventDefault();
    const v = inp.value; inp.value = '';
    cursorEl?.remove(); cursorEl = echoEl = null;
    const cb = onEnter; onEnter = null;
    cb(v);
  });
  document.addEventListener('click', () => { if (onEnter) inp.focus(); });
}

function read(row: HTMLDivElement): Promise<string> {
  return new Promise((res, rej) => {
    echoEl = sp('c-cmd');
    cursorEl = sp('cursor');
    row.append(echoEl, cursorEl);
    inp.value = ''; inp.focus();
    onEnter = res;
    onCtrlC = () => rej(new CtrlCSignal());
  });
}

async function askYN(q: string): Promise<boolean> {
  while (true) {
    const row = ln(sp('c-text', q + ' (Y/n): '));
    const ans = (await read(row)).trim().toLowerCase();
    const echo = row.lastChild as HTMLSpanElement;
    if (ans === 'y' || ans === 'yes' || ans === '') { echo.textContent = 'Y'; echo.className = 'c-yes'; return true; }
    if (ans === 'n' || ans === 'no') { echo.className = 'c-no'; return false; }
    ln(sp('c-error', 'Y または n を入力してください。'));
  }
}

async function askRetry(): Promise<boolean> {
  ln(sp('c-info', "Press 'r' to retry / 'q' to quit"));
  while (true) {
    const row = ln(sp('c-prompt', '> '));
    const ans = (await read(row)).trim().toLowerCase();
    const echo = row.lastChild as HTMLSpanElement;
    if (ans === 'r' || ans === 'retry') { echo.className = 'c-yes'; return true; }
    if (ans === 'q' || ans === 'quit')  { echo.className = 'c-no';  return false; }
  }
}

async function loading() {
  blank();
  const s = sp('c-loading', 'マッチング中');
  const cur = sp('cursor');
  ln(s, cur);
  const dots = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < dots; i++) { await sleep(300 + Math.random() * 600); s.textContent += '.'; }
  cur.remove();
  blank();
}

async function session(cfg: AppConfig): Promise<void> {
  term.innerHTML = '';
  const cmdLine = ln(sp('c-prompt', cfg.prompt + '$ '));
  const cmd = sp('c-cmd');
  cmdLine.append(cmd);
  await sleep(300); await type(cmd, 'start'); await sleep(400);
  blank();

  if (!await askYN(cfg.messages.q1)) {
    blank();
    ln(sp('c-error', cfg.messages.errorNotStudent));
    blank();
    return (await askRetry()) ? session(cfg) : quit(cfg);
  }

  await askYN(cfg.messages.q2);
  await loading();
  ln(sp('c-warn', cfg.messages.noMatch));
  blank();
  return (await askRetry()) ? session(cfg) : quit(cfg);
}

async function quit(cfg: AppConfig) {
  blank();
  ln(sp('c-info', 'start と入力すると再開できます。'));
  while (true) {
    const row = ln(sp('c-prompt', cfg.prompt + '$ '));
    try {
      const ans = (await read(row)).trim().toLowerCase();
      const echo = row.lastChild as HTMLSpanElement;
      if (ans === 'start') { echo.className = 'c-yes'; return session(cfg); }
      if (ans in cfg.hiddenCommands) { ln(spOrLink('c-info', cfg.hiddenCommands[ans])); continue; }
      ln(sp('c-error', `コマンドが見つかりません: ${ans}`));
    } catch (e) {
      if (e instanceof CtrlCSignal) continue;
      throw e;
    }
  }
}

export function run(container: HTMLElement, cfg: AppConfig) {
  term = container;
  initInput();
  const go = async (): Promise<void> => {
    try { await session(cfg); }
    catch (e) { if (e instanceof CtrlCSignal) await quit(cfg); else throw e; }
  };
  go();
}
