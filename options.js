function restoreKey() {
  chrome.storage.sync.get('teleputKey', res => {
    document.getElementById('key').value = res ? res.teleputKey || '' : '';
  })
}

document.addEventListener('DOMContentLoaded', restoreKey);

document.getElementById('keyform').addEventListener('submit', (e) => {
  var props = { teleputKey: document.getElementById('key').value };
  chrome.storage.sync.set(props, res => {
    if (chrome.runtime.lastError)
      console.error('Failed to write the key', chrome.runtime.lastError);
  });
  e.preventDefault();
});

const CONTACT_FIELDS = ['name', 'email', 'subject', 'message'];

function restoreContactForm() {
  chrome.storage.sync.get('contactForm', res => {
    const contact = (res && res.contactForm) || {};
    for (let field of CONTACT_FIELDS)
      document.getElementById('contact-' + field).value = contact[field] || '';
  });
}

document.addEventListener('DOMContentLoaded', restoreContactForm);

document.getElementById('contactform').addEventListener('submit', (e) => {
  const contact = {};
  for (let field of CONTACT_FIELDS)
    contact[field] = document.getElementById('contact-' + field).value;
  const status = document.getElementById('contact-status');
  chrome.storage.sync.set({ contactForm: contact }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to write the contact form', chrome.runtime.lastError);
      status.innerText = 'Failed to save';
    } else {
      status.innerText = 'Saved';
    }
  });
  e.preventDefault();
});
