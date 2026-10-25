(function () {
  'use strict';
  const { buildSelector, textSnippet, formatMarkdown } = globalThis.AnnotatorLib;
  const host = document.createElement('page-annotator-ui');
  host.style.setProperty('all', 'initial', 'important');
  for (const [key, value] of Object.entries({ position: 'fixed', inset: '0', 'z-index': '2147483647', 'pointer-events': 'none' })) {
    host.style.setProperty(key, value, 'important');
  }
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .root { font: 14px/1.5 system-ui, sans-serif; color: #f5f5f5; direction: ltr; text-align: left; }
    [hidden] { display: none !important; }
    button, textarea { font: inherit; }
    button { border: 0; border-radius: 8px; background: #383a40; color: #fff; padding: 7px 10px; cursor: pointer; }
    button:hover { background: #50535d; }
    button:focus-visible, textarea:focus-visible { outline: 2px solid #78aaff; outline-offset: 2px; }
    .clear.armed { color: #ff5a5a; font-weight: 600; }
    button:disabled { opacity: .45; cursor: default; }
    .surface { position: fixed; inset: 0; pointer-events: auto; cursor: crosshair; }
    .outline { position: fixed; border: 2px solid #3688ff; background: #3688ff15; border-radius: 3px; pointer-events: none; }
    .toolbar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px;
      pointer-events: auto; padding: 9px; background: #24262c; border: 1px solid #555; border-radius: 14px; box-shadow: 0 8px 24px #0006; max-width: calc(100vw - 12px); }
    .handle { cursor: grab; touch-action: none; }
    .count { white-space: nowrap; padding: 0 6px; }
    .send { background: #d85a18; }
    .send:hover { background: #ed6c27; }
    .marker { position: fixed; display: flex; gap: 6px; align-items: flex-start; }
    .badge, .dot { border-radius: 50%; background: #2676ed; box-shadow: 0 2px 5px #0004; }
    .badge { min-width: 28px; height: 28px; padding: 3px 7px; pointer-events: auto; }
    .bubble { background: #2469ce; padding: 5px 9px; border-radius: 8px; max-width: min(140px, 30vw); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: auto; }
    .bubble:hover { max-width: min(240px, 44vw); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 120px; overflow: auto; }
    .dim { opacity: .5; }
    .dot { position: fixed; width: 12px; height: 12px; }
    .editor { position: fixed; width: min(300px, calc(100vw - 16px)); padding: 12px; background: #24262c; border: 1px solid #555; border-radius: 12px; pointer-events: auto; box-shadow: 0 8px 24px #0005; }
    textarea { display: block; width: 100%; height: 90px; resize: vertical; max-height: 40vh; border-radius: 6px; padding: 8px; background: #34363d; border: 1px solid #777; color: white; }
    .editor-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .check { border-radius: 50%; background: #2676ed; width: 34px; height: 34px; padding: 4px; }
    .hint { color: #c4c7cf; font-size: 12px; margin-bottom: 6px; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #24262c; padding: 10px 18px; border-radius: 8px; pointer-events: auto; }
    @media (max-width: 600px) { .toolbar { gap: 3px; flex-wrap: wrap; justify-content: center; } button { padding: 6px; } }
  </style><div class="root">
    <div class="surface" hidden></div><div class="outline" hidden></div><div class="markers"></div>
    <div class="dot" hidden></div>
    <div class="editor" role="dialog" hidden>
      <div class="hint"></div>
      <textarea></textarea>
      <div class="editor-actions"><button class="delete"></button><button class="cancel"></button><button class="check">✓</button></div>
    </div>
    <div class="toolbar" role="toolbar" hidden>
      <button class="handle">⠿</button><span class="count"></span>
      <button class="pick"></button>
      <button class="visibility"></button>
      <button class="clear"></button>
      <button class="send"></button><button class="close">×</button>
    </div><div class="toast" role="status" hidden></div>
  </div>`;
  const $ = selector => shadow.querySelector(selector);
  const surface = $('.surface');
  const outline = $('.outline');
  const editor = $('.editor');
  const input = $('textarea');
  const toolbar = $('.toolbar');
  const { LANGUAGES, STRINGS, translate } = globalThis.WebLabelsStrings;
  let language = 'en';
  const t = (key, params) => translate(language, key, params);
  let state = { active: false, items: [] };
  let picking = true;
  let markersVisible = true;
  let hovered = null;
  let pending = null;
  let markerNodes = [];
  let frame = 0;
  let clearTimer;
  let toastTimer;
  let clearArmed = false;
  let busy = false;
  let drag = null;
  function toast(message) {
    $('.toast').textContent = message;
    $('.toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('.toast').hidden = true; }, 3200);
  }
  async function request(message) {
    let result;
    try { result = await chrome.runtime.sendMessage(message); }
    catch { throw Error(t('connectionFailed')); }
    if (!result || result.error) {
      const key = Object.hasOwn(STRINGS.en, result?.error) ? result.error : 'connectionFailed';
      throw Error(t(key));
    }
    return result;
  }
  function cancel() {
    pending = null;
    editor.hidden = true;
    $('.dot').hidden = true;
    sync();
  }
  function apply(next) {
    state = next;
    if (!state.active) {
      pending = null;
      editor.hidden = true;
    }
    renderMarkers();
    sync();
  }
  function sync() {
    toolbar.hidden = !state.active;
    surface.hidden = !state.active || !picking || Boolean(pending);
    outline.hidden = surface.hidden || !hovered;
    $('.dot').hidden = !state.active || !pending;
    const here = state.items.filter(item => item.url === location.href).length;
    $('.count').textContent = t('count', { n: state.items.length }) + (here === state.items.length ? '' : t('countHere', { m: here }));
    $('.pick').textContent = t(picking ? 'picking' : 'paused');
    $('.pick').title = t(picking ? 'pauseHint' : 'resumeHint');
    $('.pick').setAttribute('aria-label', t(picking ? 'pauseSelection' : 'resumeSelection'));
    $('.pick').setAttribute('aria-pressed', String(picking));
    $('.visibility').textContent = t(markersVisible ? 'hide' : 'show');
    $('.visibility').setAttribute('aria-label', t(markersVisible ? 'hideMarkers' : 'showMarkers'));
    $('.send').disabled = busy || !state.items.length;
    $('.clear').disabled = busy || !state.items.length;
    $('.markers').hidden = !state.active || !markersVisible;
    if (state.active && !frame) frame = requestAnimationFrame(position);
  }
  async function mutate(message) {
    try { apply(await request(message)); return true; }
    catch (error) { toast(error.message); return false; }
  }
  function find(item) {
    try { return document.querySelector(item.selector); } catch { return null; }
  }
  function pageRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
  }
  function anchor(item) {
    const el = find(item);
    const rect = el ? pageRect(el) : item.rect;
    const point = item.point || { x: 1, y: 0 };
    return { x: rect.x + rect.w * point.x - scrollX, y: rect.y + rect.h * point.y - scrollY, found: Boolean(el) };
  }
  function renderMarkers() {
    $('.markers').replaceChildren();
    markerNodes = state.items.filter(item => item.url === location.href).map(item => {
      const node = document.createElement('div');
      node.className = 'marker';
      const badge = document.createElement('button');
      badge.className = 'badge';
      badge.textContent = item.n;
      badge.setAttribute('aria-label', t('editNumber', { n: item.n }));
      badge.addEventListener('click', () => openEditor(item));
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = item.comment;
      node.append(badge, bubble);
      $('.markers').append(node);
      return { node, item };
    });
  }
  function position() {
    frame = 0;
    if (!state.active) return;
    for (const { node, item } of markerNodes) {
      const p = anchor(item);
      const flip = p.x > innerWidth - 280;
      node.style.left = flip ? 'auto' : `${Math.max(0, p.x - 14)}px`;
      node.style.right = flip ? `${Math.max(0, innerWidth - p.x - 14)}px` : 'auto';
      node.style.top = `${p.y - 14}px`;
      node.style.flexDirection = flip ? 'row-reverse' : 'row';
      node.classList.toggle('dim', !p.found);
      node.title = p.found ? '' : t('notFound');
    }
    if (hovered?.isConnected && !surface.hidden) {
      const r = hovered.getBoundingClientRect();
      Object.assign(outline.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
    } else outline.hidden = true;
    if (pending) {
      const p = anchor(pending);
      Object.assign($('.dot').style, { left: `${p.x - 6}px`, top: `${p.y - 6}px` });
      const box = editor.getBoundingClientRect();
      editor.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, p.x + 12))}px`;
      editor.style.top = `${Math.max(8, Math.min(innerHeight - box.height - 8, p.y + 12))}px`;
    }
    frame = requestAnimationFrame(position);
  }
  function targetAt(event) {
    return document.elementsFromPoint(event.clientX, event.clientY).find(el => el !== host && !host.contains(el));
  }
  function isUI(event) {
    return event.composedPath().includes(host) && !event.composedPath().includes(surface);
  }
  function openEditor(item) {
    pending = { ...item };
    hovered = null;
    input.value = item.comment || '';
    $('.delete').hidden = !state.items.some(entry => entry.id === item.id);
    editor.hidden = false;
    sync();
    input.focus();
  }
  function pick(el, event) {
    if (!el) return;
    const box = el.getBoundingClientRect();
    const fraction = (value, start, size) => size ? Math.min(1, Math.max(0, (value - start) / size)) : 0;
    openEditor({ id: crypto.randomUUID(), url: location.href, title: document.title,
      selector: buildSelector(el), tag: el.tagName.toLowerCase(), text: textSnippet(el),
      rect: pageRect(el), point: { x: fraction(event.clientX, box.x, box.width), y: fraction(event.clientY, box.y, box.height) }, viewport: { w: innerWidth, h: innerHeight }, comment: '', createdAt: new Date().toISOString() });
  }
  document.addEventListener('pointermove', event => {
    if (state.active && picking && !pending && !isUI(event)) {
      hovered = targetAt(event);
      outline.hidden = !hovered;
    } else { hovered = null; outline.hidden = true; }
  }, true);
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu']) {
    window.addEventListener(type, event => {
      if (!state.active || !picking || isUI(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (type === 'click' && !pending) pick(targetAt(event), event);
    }, true);
  }
  for (const type of ['click', 'pointerdown', 'pointerup', 'keydown', 'keyup']) {
    host.addEventListener(type, event => event.stopPropagation());
  }
  async function save() {
    if (!pending || busy || !input.value.trim()) return;
    busy = true;
    const item = { ...pending, comment: input.value.trim() };
    if (await mutate({ type: 'save', item })) cancel();
    busy = false;
    sync();
  }
  $('.check').addEventListener('click', save);
  $('.cancel').addEventListener('click', cancel);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); }
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
  });
  $('.delete').addEventListener('click', async () => {
    if (pending && await mutate({ type: 'delete', id: pending.id })) cancel();
  });
  $('.pick').addEventListener('click', () => { picking = !picking; cancel(); });
  $('.visibility').addEventListener('click', () => { markersVisible = !markersVisible; sync(); });
  $('.close').addEventListener('click', () => mutate({ type: 'mode', active: false }));
  $('.clear').addEventListener('click', async () => {
    if (clearArmed) {
      if (await mutate({ type: 'clear' })) cancel();
      clearArmed = false;
      $('.clear').textContent = t('clear');
      $('.clear').classList.remove('armed');
    } else {
      clearArmed = true;
      $('.clear').textContent = t('clearConfirm');
      $('.clear').classList.add('armed');
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => { clearArmed = false; $('.clear').textContent = t('clear'); $('.clear').classList.remove('armed'); }, 3000);
    }
  });
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const field = document.createElement('textarea');
      field.value = text;
      $('.root').append(field);
      field.focus();
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw Error(t('copyFailed'));
    }
  }
  $('.send').addEventListener('click', async () => {
    if (busy || !state.items.length) return;
    const items = [...state.items];
    busy = true;
    sync();
    try {
      await copy(formatMarkdown(items, { title: document.title, url: location.href }));
      if (await mutate({ type: 'sent', ids: items.map(item => item.id) })) {
        cancel();
        toast(t('copied', { n: items.length }));
      }
    } catch (error) { toast(error.message); }
    busy = false;
    sync();
  });
  $('.handle').addEventListener('pointerdown', event => {
    const rect = toolbar.getBoundingClientRect();
    drag = { x: event.clientX - rect.x, y: event.clientY - rect.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  $('.handle').addEventListener('pointermove', event => {
    if (!drag) return;
    toolbar.style.transform = 'none';
    toolbar.style.bottom = 'auto';
    toolbar.style.left = `${Math.max(0, Math.min(innerWidth - toolbar.offsetWidth, event.clientX - drag.x))}px`;
    toolbar.style.top = `${Math.max(0, Math.min(innerHeight - toolbar.offsetHeight, event.clientY - drag.y))}px`;
  });
  for (const type of ['pointerup', 'lostpointercapture']) $('.handle').addEventListener(type, () => { drag = null; });
  window.addEventListener('resize', () => {
    if (!toolbar.style.top) return;
    const rect = toolbar.getBoundingClientRect();
    toolbar.style.left = `${Math.max(0, Math.min(innerWidth - rect.width, rect.x))}px`;
    toolbar.style.top = `${Math.max(0, Math.min(innerHeight - rect.height, rect.y))}px`;
  });
  let currentURL = location.href;
  setInterval(() => {
    if (state.active && currentURL !== location.href) { currentURL = location.href; cancel(); renderMarkers(); }
  }, 500);
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'state') apply(message.state);
  });
  function renderText() {
    for (const [selector, key] of Object.entries({ '.hint': 'hint', '.delete': 'delete', '.cancel': 'cancel', '.send': 'send' })) {
      $(selector).textContent = t(key);
    }
    for (const [selector, key] of Object.entries({ '.editor': 'editNote', 'textarea': 'note', '.delete': 'deleteNote', '.check': 'saveNote', '.toolbar': 'toolbar', '.handle': 'drag', '.clear': 'clearAll', '.close': 'close' })) {
      $(selector).setAttribute('aria-label', t(key));
    }
    input.placeholder = t('placeholder');
    $('.handle').title = t('drag');
    $('.clear').textContent = t(clearArmed ? 'clearConfirm' : 'clear');
    for (const { node, item } of markerNodes) {
      node.children[0].setAttribute('aria-label', t('editNumber', { n: item.n }));
      node.title = anchor(item).found ? '' : t('notFound');
    }
  }
  function setLanguage(value) {
    language = LANGUAGES.includes(value) ? value : 'en';
    renderText();
    sync();
  }
  renderText();
  let languageRevision = 0;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, 'language')) return;
    languageRevision++;
    setLanguage(changes.language.newValue);
  });
  const initialRevision = languageRevision;
  chrome.storage.local.get('language').then(saved => {
    if (languageRevision === initialRevision) setLanguage(saved.language);
  }).catch(() => {});
  request({ type: 'get' }).then(apply).catch(error => toast(error.message));
})();
