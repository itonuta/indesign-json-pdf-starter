(function () {
  // >>>> 1) https://script.google.com/macros/s/AKfycbwDPk5UhYAnTXOPOSRHGTLl9mnfxMaqXRy38UQFEXR6aGKxRX0DKpne_OpQiagk1umE/exec <<<<
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbwDPk5UhYAnTXOPOSRHGTLl9mnfxMaqXRy38UQFEXR6aGKxRX0DKpne_OpQiagk1umE/exec'; // e.g. https://script.google.com/macros/s/AKfycb.../exec

  const form = document.getElementById('menuForm');
  const preview = document.getElementById('preview');
  const previewWrap = document.getElementById('previewWrap');
  const resetBtn = document.getElementById('resetBtn');

  function sanitizeFileName(s) {
    return String(s || '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function shortCode() {
    if (crypto && crypto.getRandomValues) {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(n => (n % 36).toString(36)).join('');
    }
    return Math.random().toString(36).slice(2, 8);
  }

  function buildDataObj(code) {
    const fd = new FormData(form);
    const data = {
      _id: code, // important: used as retrieval key
      title: (fd.get('title') || '').trim(),
      restaurant: (fd.get('restaurant') || '').trim(),
      dish1: (fd.get('dish1') || '').trim(),
      price1: (fd.get('price1') || '').trim(),
      dish2: (fd.get('dish2') || '').trim(),
      price2: (fd.get('price2') || '').trim(),
    };
    const outputName = sanitizeFileName(fd.get('outputName') || '');
    if (outputName) data.outputName = outputName;
    return data;
  }

  function updatePreview() {
    // Preview reflects what will be uploaded (without the _id)
    const code = document.getElementById('code').value || 'xxxxxx';
    const data = buildDataObj(code);
    const { _id, ...visible } = data;
    preview.textContent = JSON.stringify(visible, null, 2);
  }

  function validateRequired(fields) {
    let ok = true;
    fields.forEach(name => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el.value.trim()) {
        el.setCustomValidity('Please fill this field');
        el.reportValidity();
        ok = false;
      } else {
        el.setCustomValidity('');
      }
    });
    return ok;
  }

  // Add a little UI for the code + resulting URL
  const codeRow = document.createElement('div');
  codeRow.className = 'row';
  codeRow.innerHTML = `
    <label>
      <span>Code (share this code)</span>
      <input type="text" id="code" readonly />
      <small class="muted">We’ll use this to fetch your data in InDesign.</small>
    </label>
    <label>
      <span>Fetch URL (for your InDesign script)</span>
      <input type="text" id="fetchUrl" readonly />
      <small class="muted">Paste into the script prompt (or use the code only if you set a default EXEC_URL there).</small>
    </label>`;
  form.appendChild(codeRow);

  function regenerateCodeAndUrl() {
    const code = shortCode();
    const codeEl = document.getElementById('code');
    const urlEl = document.getElementById('fetchUrl');
    codeEl.value = code;
    urlEl.value = EXEC_URL + '?id=' + encodeURIComponent(code);
    updatePreview();
  }

  form.addEventListener('input', updatePreview);
  resetBtn.addEventListener('click', () => {
    form.reset();
    regenerateCodeAndUrl();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const required = ['title','restaurant','dish1','price1','dish2','price2'];
    if (!validateRequired(required)) return;

    const code = document.getElementById('code').value || shortCode();
    const data = buildDataObj(code);

    // Upload using "no-cors" + text/plain to avoid preflight/CORS.
    // We can’t read the response, but that’s fine; the fetch URL is deterministic.
    try {
      await fetch(EXEC_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(data)
      });
      if (!previewWrap.open) previewWrap.open = true;
      alert('Uploaded! Share the Code or Fetch URL with your designer.');
    } catch (err) {
      alert('Upload failed: ' + err);
    }
  });

  // Initialize
  regenerateCodeAndUrl();
})();
