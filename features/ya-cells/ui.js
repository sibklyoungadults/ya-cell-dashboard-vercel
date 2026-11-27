// ============================================================================
// Cell Intro tab — browser UI (team area only). Loaded by team/index.html.
//
// Shows every active Young Adults cell as ready-to-paste WhatsApp text from
// GET /api/ya-cells, with search, Meeting Day chips, an Area dropdown,
// per-cell Copy and "Copy all visible". Data is fetched the first time the
// tab opens; "Refresh now" bypasses the 5-minute cache.
// ============================================================================
(function () {
  const ROOT_ID = 'yaCellsRoot';
  const S = { data: null, loading: false, error: '', day: '', area: '', q: '' };

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const root = () => document.getElementById(ROOT_ID);

  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    return typeof copyToClipboard === 'function' ? copyToClipboard(text) : false;
  }
  function flash(btn, ok, label) {
    btn.textContent = ok ? 'Copied ✓' : 'Copy failed';
    btn.classList.toggle('copied', ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 2000);
  }

  function visible() {
    if (!S.data) return [];
    const q = S.q.trim().toLowerCase();
    return S.data.cells.filter(c =>
      (!S.day || c.days.includes(S.day)) &&
      (!S.area || c.area === S.area) &&
      (!q || [c.name, c.area].concat(c.leaders).some(v => String(v).toLowerCase().includes(q))));
  }

  async function load(fresh) {
    if (S.loading) return;
    S.loading = true; S.error = ''; render();
    try {
      const url = '/api/ya-cells' + (fresh ? '?fresh=' + Date.now() : '');
      const r = await fetch(url, fresh ? { cache: 'no-store' } : {});
      let body = null; try { body = await r.json(); } catch (e) {}
      if (r.status === 401) throw new Error('Your login has expired. Reload the page to log in again.');
      if (!r.ok || !body || !Array.isArray(body.cells)) throw new Error((body && body.error) || ('Error ' + r.status));
      S.data = body;
      if (S.area && !body.areas.includes(S.area)) S.area = '';
      if (S.day && !body.days.includes(S.day)) S.day = '';
    } catch (e) {
      S.error = e.message || String(e);
    } finally {
      S.loading = false; render();
    }
  }

  function render() {
    const el = root(); if (!el) return;
    const d = S.data;
    const list = visible();
    const updated = d ? new Date(d.fetchedAt).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }) : '';
    const focusId = document.activeElement && document.activeElement.id;

    let html = '';
    if (S.error) html += `<div class="ycx-banner ycx-error">⚠️ ${esc(S.error)}</div>`;
    if (d) d.warnings.forEach(w => { html += `<div class="ycx-banner">⚠️ ${esc(w)} Check the sheet’s header row (row 2) or the placeholders in <code>features/ya-cells/template.js</code>.</div>`; });
    if (d) d.notices.forEach(n => { html += `<div class="ycx-notice">ℹ️ ${esc(n)}</div>`; });

    html += `<div class="ycx-bar">
      <span class="ycx-meta">${d ? `<b>${list.length === d.cells.length ? d.cells.length : list.length + ' of ' + d.cells.length}</b> cell${d.cells.length === 1 ? '' : 's'} · updated ${esc(updated)}` : (S.loading ? 'Loading cells…' : '')}</span>
      <span class="ycx-actions">
        <button class="copy-all-btn" id="ycxRefresh" ${S.loading ? 'disabled' : ''}>${S.loading ? 'Loading…' : '↻ Refresh now'}</button>
        <button class="copy-all-btn" id="ycxCopyAll" ${list.length ? '' : 'disabled'}>📋 Copy all visible</button>
      </span>
    </div>`;

    if (d) {
      html += `<div class="ycx-filters">
        <input class="search-box ycx-search" type="search" id="ycxSearch" placeholder="🔍 Search cell, leader or area…" value="${esc(S.q)}">
        <select class="search-box ycx-area" id="ycxArea" aria-label="Area">
          <option value="">All areas</option>
          ${d.areas.map(a => `<option value="${esc(a)}"${a === S.area ? ' selected' : ''}>${esc(a)}</option>`).join('')}
        </select>
      </div>
      <div class="chips-row" id="ycxDays">
        <button class="chip${S.day ? '' : ' active'}" data-day="">All days</button>
        ${d.days.map(day => `<button class="chip${day === S.day ? ' active' : ''}" data-day="${esc(day)}">${esc(day)}</button>`).join('')}
      </div>`;
      html += list.length ? `<div class="ycx-grid">${list.map((c, i) => `
        <div class="wa-msg-block ycx-card">
          <div class="wa-msg-header">
            <span class="wa-msg-label">${esc(c.name)}</span>
            <span class="wa-msg-badge wa-badge-std">${esc(c.days.join(' · ') || '—')}</span>
          </div>
          <pre class="wa-msg-body ycx-text">${esc(c.text)}</pre>
          <button class="wa-copy-btn" data-i="${i}">📋 Copy</button>
        </div>`).join('')}</div>`
        : '<div class="no-rooms">No cells match these filters.</div>';
    }
    el.innerHTML = html;

    // wire events
    const $ = id => document.getElementById(id);
    $('ycxRefresh').onclick = () => load(true);
    const copyAllBtn = $('ycxCopyAll');
    copyAllBtn.onclick = async () => {
      const ok = await copyText(visible().map(c => c.text).join('\n\n'));
      flash(copyAllBtn, ok, '📋 Copy all visible');
    };
    if (d) {
      const s = $('ycxSearch');
      s.oninput = () => { S.q = s.value; const pos = s.selectionStart; render(); const n = $('ycxSearch'); n.focus(); n.setSelectionRange(pos, pos); };
      $('ycxArea').onchange = (e) => { S.area = e.target.value; render(); };
      el.querySelectorAll('#ycxDays .chip').forEach(b => b.onclick = () => { S.day = b.dataset.day; render(); });
      el.querySelectorAll('.ycx-card .wa-copy-btn').forEach(b => b.onclick = async () => {
        const ok = await copyText(list[Number(b.dataset.i)].text);
        flash(b, ok, '📋 Copy');
      });
      if (focusId === 'ycxSearch') { const n = $('ycxSearch'); n.focus(); }
    }
  }

  // Called by team/index.html's switchPage('yacells')
  window.YaCells = { show() { if (!S.data && !S.loading) load(false); else render(); } };
})();
