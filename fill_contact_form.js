// Injected into the page (or frame) by background.js when the
// "Fill contact form" context menu item is clicked.
// Expects window.__teleputContactData = { name, email, subject, message, targetElementId }.
(function() {
  const data = window.__teleputContactData;
  delete window.__teleputContactData;
  if (!data)
    return;

  // Second-level labels that sit under a country code, e.g. example.com.au
  const SECOND_LEVEL = ['com', 'net', 'org', 'edu', 'gov', 'co', 'ac', 'asn', 'id', 'ltd', 'plc', 'me', 'nom', 'sch'];

  function domainParts(hostname) {
    const domain = hostname.replace(/^www\./i, '');
    const labels = domain.split('.');
    let suffixLength = 1;
    if (labels.length > 2 && labels[labels.length - 1].length == 2 &&
        SECOND_LEVEL.includes(labels[labels.length - 2]))
      suffixLength = 2;
    const noExt = labels.length > suffixLength ? labels[labels.length - suffixLength - 1] : domain;
    return { domain: domain, noExt: noExt };
  }

  let hostname = window.location.hostname;
  try {
    // Forms embedded in iframes should still use the site's domain
    hostname = window.top.location.hostname || hostname;
  } catch (e) { /* cross-origin frame */ }
  const parts = domainParts(hostname);

  function substitute(text) {
    return (text || '')
      .replace(/<domain>/g, parts.domain)
      .replace(/<domain_no_ext>/g, parts.noExt);
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly)
      return false;
    if (el.tagName == 'TEXTAREA')
      return true;
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return ['text', 'email', 'search', ''].includes(type);
  }

  function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // Everything that describes what a field is for, lowercased
  function describe(el) {
    const bits = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
                  el.getAttribute('autocomplete'), el.getAttribute('type')];
    if (el.labels)
      for (let label of el.labels)
        bits.push(label.textContent);
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy)
      for (let id of labelledBy.split(/\s+/)) {
        const label = document.getElementById(id);
        if (label)
          bits.push(label.textContent);
      }
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  function fieldsIn(root) {
    return Array.from(root.querySelectorAll('input, textarea'))
      .filter(el => isFillable(el) && isVisible(el));
  }

  // Pick the form to fill: the one that was right-clicked, otherwise the
  // form on the page that looks most like a contact form.
  function findRoot() {
    let target = null;
    if (data.targetElementId != null && typeof browser !== 'undefined' &&
        browser.menus && browser.menus.getTargetElement)
      target = browser.menus.getTargetElement(data.targetElementId);
    if (target && target.closest && target.closest('form'))
      return target.closest('form');

    let best = null, bestScore = 0;
    for (let form of document.querySelectorAll('form')) {
      const fields = fieldsIn(form);
      let score = 0;
      if (fields.some(el => el.tagName == 'TEXTAREA')) score += 3;
      if (fields.some(el => /e-?mail/.test(describe(el)))) score += 2;
      if (fields.some(el => /subject|message|enquiry|inquiry/.test(describe(el)))) score += 1;
      if (score > bestScore) {
        best = form;
        bestScore = score;
      }
    }
    // Some forms are built without a <form> element
    return best || document.body;
  }

  // Set the value in a way frameworks like React and Vue notice
  function setValue(el, value) {
    const proto = el.tagName == 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  const root = findRoot();
  const fields = fieldsIn(root);
  const used = new Set();

  function take(predicate) {
    const el = fields.find(el => !used.has(el) && predicate(el, describe(el)));
    if (el)
      used.add(el);
    return el;
  }

  const emailField = take((el, d) => el.type == 'email' || /e-?mail/.test(d));
  const messageField =
    take((el, d) => el.tagName == 'TEXTAREA' && /message|comment|enquiry|inquiry|question|detail|body/.test(d)) ||
    take(el => el.tagName == 'TEXTAREA');
  const subjectField = take((el, d) => el.tagName == 'INPUT' && /subject|topic|regarding/.test(d));

  let firstNameField = null, lastNameField = null, nameField = null;
  if (data.name) {
    firstNameField = take((el, d) => el.tagName == 'INPUT' && /first|fname|given/.test(d));
    lastNameField = take((el, d) => el.tagName == 'INPUT' && /last|lname|surname|family/.test(d));
    nameField = take((el, d) => el.tagName == 'INPUT' && /name/.test(d) &&
                                !/user|company|business|organi[sz]ation/.test(d));
  }

  const filled = [];
  function fill(el, value, label) {
    if (el && value) {
      setValue(el, value);
      filled.push(label);
    }
  }

  fill(emailField, data.email, 'email');
  fill(subjectField, substitute(data.subject), 'subject');
  fill(messageField, substitute(data.message), 'message');
  if (firstNameField || lastNameField) {
    const words = data.name.trim().split(/\s+/);
    if (firstNameField && lastNameField) {
      fill(firstNameField, words.slice(0, -1).join(' ') || words[0], 'first name');
      fill(lastNameField, words.length > 1 ? words[words.length - 1] : '', 'last name');
    } else {
      fill(firstNameField || lastNameField, data.name, 'name');
    }
  }
  fill(nameField, data.name, 'name');

  if (!filled.length) {
    window.alert('Teleput: could not find a contact form to fill on this page.');
    return;
  }

  // Bring the end of the form into view, where the captcha and send button usually are
  const submit = root.querySelector('button[type=submit], input[type=submit], button:not([type])');
  const last = submit || messageField || emailField;
  if (last)
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
})();
