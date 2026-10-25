'use strict';
const queues = new Map();
const fresh = () => ({ active: false, picking: true, items: [], nextN: 1 });
function enqueue(tabId, operation) {
  const task = (queues.get(tabId) || Promise.resolve()).catch(() => {}).then(operation);
  queues.set(tabId, task);
  task.finally(() => { if (queues.get(tabId) === task) queues.delete(tabId); }).catch(() => {});
  return task;
}
async function update(tabId, message) {
  const key = `tab:${tabId}`;
  const state = (await chrome.storage.session.get(key))[key] || fresh();
  switch (message.type) {
    case 'toggle': state.active = !state.active; break;
    case 'mode': state.active = Boolean(message.active); break;
    case 'picking': state.picking = Boolean(message.value); break;
    case 'save': {
      const item = message.item;
      if (!item || typeof item.id !== 'string' || !String(item.comment || '').trim()) throw Error('Invalid annotation');
      const index = state.items.findIndex(entry => entry.id === item.id);
      const entry = {};
      for (const field of ['id', 'url', 'title', 'selector', 'tag', 'text', 'comment', 'createdAt']) {
        entry[field] = String(item[field] ?? '');
      }
      entry.rect = {};
      entry.viewport = {};
      for (const field of ['x', 'y', 'w', 'h']) entry.rect[field] = Number(item.rect?.[field]) || 0;
      for (const field of ['w', 'h']) entry.viewport[field] = Number(item.viewport?.[field]) || 0;
      // Click point as a 0-1 fraction of the element box.
      entry.point = {};
      for (const field of ['x', 'y']) entry.point[field] = Math.min(1, Math.max(0, Number(item.point?.[field]))) || 0;
      entry.n = index < 0 ? state.nextN++ : state.items[index].n;
      if (index < 0) state.items.push(entry);
      else state.items[index] = entry;
      break;
    }
    case 'delete': state.items = state.items.filter(item => item.id !== message.id); break;
    case 'clear': state.items = []; state.nextN = 1; break;
    case 'sent': state.items = state.items.filter(item => !message.ids.includes(item.id)); break;
    case 'get': return state;
    default: throw Error('Unknown request');
  }
  // Renumber so deleted and sent annotations free their numbers.
  state.items.forEach((entry, i) => { entry.n = i + 1; });
  state.nextN = state.items.length + 1;
  await chrome.storage.session.set({ [key]: state });
  return state;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || !['get', 'mode', 'picking', 'save', 'delete', 'clear', 'sent'].includes(message?.type)) return false;
  enqueue(sender.tab.id, () => update(sender.tab.id, message))
    .then(respond, () => respond({ error: 'saveFailed' }));
  return true;
});
async function toggle(tab) {
  if (tab?.id == null) return;
  const state = await enqueue(tab.id, () => update(tab.id, { type: 'toggle' }));
  try {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'state', state });
    } catch {
      // Tabs opened before install have no content script yet. Inject it, then resend.
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/i18n/strings.js', 'src/content/lib.js', 'src/content/content.js'] });
      await chrome.tabs.sendMessage(tab.id, { type: 'state', state });
    }
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  } catch {
    // Protected pages (chrome://, Web Store) reject injection. Undo the toggle and show a badge.
    await enqueue(tab.id, () => update(tab.id, { type: 'mode', active: false }));
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
  }
}
chrome.action.onClicked.addListener(toggle);
chrome.commands.onCommand.addListener(async command => {
  if (command === 'toggle-annotate') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await toggle(tab);
  }
});
chrome.tabs.onRemoved.addListener(tabId => {
  enqueue(tabId, () => chrome.storage.session.remove(`tab:${tabId}`)).catch(() => {});
});
