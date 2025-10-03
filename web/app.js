(function () {
  const form = document.getElementById('menuForm');
  const preview = document.getElementById('preview');
  const previewWrap = document.getElementById('previewWrap');
  const resetBtn = document.getElementById('resetBtn');

  function sanitizeFileName(s) {
    return String(s || '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function buildDataObj() {
    const fd = new FormData(form);
    const data = {
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
    const data = buildDataObj();
    preview.textContent = JSON.stringify(data, null, 2);
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

  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const required = ['title','restaurant','dish1','price1','dish2','price2'];
    if (!validateRequired(required)) return;

    const data = buildDataObj();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = 'menu.json';

    // Download in browser
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();

    // Open preview panel (optional)
    if (!previewWrap.open) previewWrap.open = true;
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    updatePreview();
  });

  // Initial preview
  updatePreview();
})();
