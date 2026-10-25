'use strict';
const queues = new Map();
const fresh = () => ({ active: false, items: [], nextN: 1 });
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
  await chrome.storage.session.set({ [key]: state });
  return state;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || !['get', 'mode', 'save', 'delete', 'clear', 'sent'].includes(message?.type)) return false;
  enqueue(sender.tab.id, () => update(sender.tab.id, message))
    .then(respond, () => respond({ error: '儲存失敗，請重試' }));
  return true;
});
async function toggle(tab) {
  if (tab?.id == null) return;
  try {
    const state = await enqueue(tab.id, () => update(tab.id, { type: 'toggle' }));
    await chrome.tabs.sendMessage(tab.id, { type: 'state', state });
  } catch {
    // Protected pages have no content script.
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
