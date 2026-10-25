(function () {
  'use strict';
  const { LANGUAGES, translate } = globalThis.WebLabelsStrings;
  const select = document.querySelector('#language');
  const status = document.querySelector('#status');
  let language = 'en';
  let revision = 0;
  function render(value) {
    language = LANGUAGES.includes(value) ? value : 'en';
    select.value = language;
    const t = key => translate(language, key);
    document.documentElement.lang = language;
    document.title = t('optionsTitle');
    document.querySelector('h1').textContent = t('optionsTitle');
    document.querySelector('#language-label').textContent = t('language');
    ['languageEnglish', 'languageTraditional', 'languageSimplified'].forEach((key, i) => {
      select.options[i].textContent = t(key);
    });
    if (!status.hidden) status.textContent = t('saveFailed');
  }
  render('en');
  const initialRevision = revision;
  chrome.storage.local.get('language').then(saved => {
    if (revision === initialRevision) render(saved.language);
  }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, 'language')) return;
    revision++;
    render(changes.language.newValue);
  });
  select.addEventListener('change', async () => {
    revision++;
    const next = select.value;
    select.disabled = true;
    status.hidden = true;
    try {
      await chrome.storage.local.set({ language: next });
      render(next);
    } catch {
      render(language);
      status.textContent = translate(language, 'saveFailed');
      status.hidden = false;
    } finally { select.disabled = false; }
  });
})();
