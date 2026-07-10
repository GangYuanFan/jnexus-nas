let currentPath = '', sortMode = 'name', sortAsc = true, histStack = [], histIdx = -1, allFiles = [], editor = null, ctxTarget = null, isGrid = false, currentEditingPath = '';
const ROOT = '/home/jerry/workspace';
let userPassword = '';

function checkAuth() {
    const k = document.getElementById('access-key').value;
    fetch('/nas/api/auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: k})
    }).then(r => r.json()).then(d => {
        if (d.success) {
            userPassword = k;
            document.getElementById('auth-overlay').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('auth-overlay').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                loadFiles('', true);
                loadDashboard();
            }, 400);
        } else {
            throw new Error(d.error || 'Invalid key');
        }
    }).catch(e => {
        const errEl = document.getElementById('auth-err');
        errEl.textContent = e.message || 'Invalid key. Try again.';
        errEl.style.opacity = '1';
        setTimeout(() => errEl.style.opacity = '0', 2000);
    });
}

function apiFetch(url, options = {}) {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.append('password', userPassword);
    if (options.method === 'POST' && options.body) {
        try {
            const body = JSON.parse(options.body);
            body.password = userPassword;
            options.body = JSON.stringify(body);
        } catch (e) {}
    }
    return fetch(urlObj.toString(), options);
}

document.getElementById('access-key').addEventListener('keypress', e => { if(e.key==='Enter') checkAuth(); });

window.addEventListener('click', e => {
    document.getElementById('ctx-menu').style.display = 'none';
});

function switchPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');
    const navItem = document.querySelector('.nav-item[data-page="' + name + '"]');
    if (navItem) navItem.classList.add('active');
    if (name === 'dashboard') loadDashboard();
    if (name === 'system') loadSystemInfo();
    closeSidebar();
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

async function loadDashboard() {
    try {
        const r = await apiFetch('/nas/api/sysinfo');
        const d = await r.json();
        document.getElementById('dash-cpu').textContent = d.cpu_percent.toFixed(1) + '%';
        document.getElementById('dash-cpu-bar').style.width = d.cpu_percent + '%';
        document.getElementById('dash-mem').textContent = (d.memory.used_gb).toFixed(1) + ' GB';
        document.getElementById('dash-mem-detail').textContent = 'of ' + (d.memory.total_gb).toFixed(1) + ' GB';
        document.getElementById('dash-mem-bar').style.width = d.memory.percent + '%';
        document.getElementById('dash-disk').textContent = (d.disk.used_gb).toFixed(1) + ' GB';
        document.getElementById('dash-disk-detail').textContent = 'of ' + (d.disk.total_gb).toFixed(1) + ' GB';
        document.getElementById('dash-disk-bar').style.width = d.disk.percent + '%';
        document.getElementById('dash-uptime').textContent = d.uptime_human;
    } catch(e) { console.log('Dashboard load error:', e); }
}

async function loadSystemInfo() {
    const el = document.getElementById('sys-content');
    try {
        const r = await apiFetch('/nas/api/sysinfo');
        const d = await r.json();
        el.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
            '<div class="card"><div class="label">CPU</div><div class="value">' + d.cpu_count + ' cores</div><div class="sub">' + d.cpu_percent.toFixed(1) + '% utilized</div></div>' +
            '<div class="card"><div class="label">Platform</div><div class="value" style="font-size:1.2rem">' + d.platform + '</div><div class="sub">' + d.hostname + '</div></div>' +
            '<div class="card"><div class="label">Memory</div><div class="value">' + (d.memory.total_gb).toFixed(1) + ' GB</div><div class="sub">' + (d.memory.used_gb).toFixed(1) + ' GB used</div></div>' +
            '<div class="card"><div class="label">Disk</div><div class="value">' + (d.disk.total_gb).toFixed(1) + ' GB</div><div class="sub">' + (d.disk.used_gb).toFixed(1) + ' GB used</div></div>' +
            '</div>';
    } catch(e) { el.innerHTML = '<div class="card">Failed to load system info.</div>'; }
}

async function loadFiles(path, pushHist = true) {
    currentPath = path;
    const grid = document.getElementById('file-grid');
    grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    renderBreadcrumb(path);
    if (pushHist) {
        histStack = histStack.slice(0, histIdx + 1);
        histStack.push(path);
        histIdx++;
    }
    updateNav();
    try {
        const r = await apiFetch('/nas/api/files?path=' + encodeURIComponent(path));
        allFiles = await r.json();
        renderFiles(allFiles);
    } catch(e) { grid.innerHTML = '<div class="card" style="text-align:center;padding:2rem;opacity:0.5">Error loading files</div>'; }
}

function renderBreadcrumb(path) {
    const el = document.getElementById('breadcrumb');
    el.innerHTML = '';
    const parts = path ? path.split('/') : [];
    const rootSpan = document.createElement('span');
    rootSpan.className = 'bc-item'; rootSpan.textContent = '/ home'; rootSpan.onclick = () => loadFiles('');
    el.appendChild(rootSpan);
    let cum = '';
    parts.forEach((p, i) => {
        cum += (i===0?'':'/') + p;
        const sp = document.createElement('span');
        sp.className = 'bc-item'; sp.textContent = ' / ' + p; sp.onclick = () => loadFiles(cum);
        el.appendChild(sp);
    });
}

function getFileIcon(n, d, fp) {
    if (d) return 'https://cdn-icons-png.flaticon.com/512/716/716784.png';
    if (n.includes('_icon') || (fp && fp.includes('/icons/'))) return 'https://cdn-icons-png.flaticon.com/512/337/337943.png';
    var e = n.split('.').pop().toLowerCase();
    var imgE = ['jpg','jpeg','png','gif','webp','svg'], vidE = ['mp4','mov','avi','mkv','webm'], offE = ['doc','docx','xls','xlsx','ppt','pptx'];
    if (imgE.indexOf(e) !== -1 || vidE.indexOf(e) !== -1 || offE.indexOf(e) !== -1) {
        if (fp) return '/nas/api/thumbnail?path=' + encodeURIComponent(fp) + '&t=' + Date.now() + '&nocache=1';
        return 'https://cdn-icons-png.flaticon.com/512/337/337943.png';
    }
    var m = {py:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg',js:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',html:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg',css:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg',pdf:'https://cdn-icons-png.flaticon.com/512/337/337946.png',doc:'https://cdn-icons-png.flaticon.com/512/732/732220.png',docx:'https://cdn-icons-png.flaticon.com/512/732/732220.png',xls:'https://cdn-icons-png.flaticon.com/512/732/732222.png',xlsx:'https://cdn-icons-png.flaticon.com/512/732/732222.png',ppt:'https://cdn-icons-png.flaticon.com/512/732/732225.png',pptx:'https://cdn-icons-png.flaticon.com/512/732/732225.png'};
    return m[e] || 'https://cdn-icons-png.flaticon.com/512/2961/2961222.png';
}

function renderFiles(files) {
    const grid = document.getElementById('file-grid');
    if (!files.length) { grid.innerHTML = '<div style="text-align:center;padding:2rem;opacity:0.3">Empty directory</div>'; return; }
    grid.className = 'file-grid' + (isGrid ? ' grid' : '');
    grid.innerHTML = '';
    const sorted = [...files].sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
        let cmp = sortMode === 'date' ? (a.mtime || 0) - (b.mtime || 0) : a.name.localeCompare(b.name, undefined, {numeric: true});
        return sortAsc ? cmp : -cmp;
    });
    sorted.forEach(f => {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        const fpath = currentPath ? currentPath + '/' + f.name : f.name;
        const iconUrl = getFileIcon(f.name, f.is_dir, fpath);
        const size = f.is_dir ? '' : (f.size / 1024).toFixed(1) + ' KB';
        entry.innerHTML = '<img src="' + iconUrl + '" class="icon" alt="icon"><span class="name">' + f.name + '</span><span class="size">' + size + '</span><span class="actions">' + (f.is_dir ? '' : '<button onclick="event.stopPropagation();download(\\'${encodeURIComponent(fpath)}\\')">⬇️</button>') + '<button onclick="event.stopPropagation();showCtx(event,\\'${f.name},\\'${encodeURIComponent(fpath)}\',${f.is_dir})">⋮</button></span>';
        entry.onclick = () => {
            if (f.is_dir) { loadFiles(fpath); return; }
            if (f.name.endsWith('.pdf')) { openPdfViewer(fpath); return; }
            if (isEditable(f.name)) openEditor(fpath);
            else download(encodeURIComponent(fpath));
        };
        grid.appendChild(entry);
    });
}

function setSort(mode) {
    if (mode === sortMode) sortAsc = !sortAsc; else { sortMode = mode; sortAsc = true; }
    renderFiles(allFiles);
}

function showCtx(e, name, encPath, isDir) {
    ctxTarget = { name, encPath, isDir };
    const m = document.getElementById('ctx-menu');
    m.style.display = 'block';
    m.style.left = e.clientX + 'px';
    m.style.top = e.clientY + 'px';
}

function ctxAction(action) {
    if (!ctxTarget) return;
    const { name, encPath, isDir } = ctxTarget;
    const path = decodeURIComponent(encPath);
    if (action === 'edit') { if(!isDir && isEditable(name)) openEditor(path); }
    else if (action === 'download') { download(encPath); }
    else if (action === 'rename') {
        const nn = prompt('New name:', name);
        if (nn && nn !== name) apiFetch('/nas/api/rename', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({oldPath:path, newName:nn}) }).then(r=>r.json()).then(r=>{ if(r.success) refresh(); });
    } else if (action === 'delete') {
        if (confirm('Delete "' + name + '" ?')) apiFetch('/nas/api/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path}) }).then(r=>r.json()).then(r=>{ if(r.success) refresh(); });
    }
    document.getElementById('ctx-menu').style.display = 'none';
}

function handleSearch() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    renderFiles(allFiles.filter(f => f.name.toLowerCase().includes(q)));
}

function goBack() { if(histIdx>0) { histIdx--; loadFiles(histStack[histIdx],false); } }
function goForward() { if(histIdx<histStack.length-1) { histIdx++; loadFiles(histStack[histIdx],false); } }
function goUp() { if(!currentPath) return; const p=currentPath.split('/'); p.pop(); loadFiles(p.join('/')); }
function refresh() { loadFiles(currentPath); }
function download(ep) { window.location.href = '/nas/api/download?path=' + ep; }
function updateNav() {
    document.getElementById('btn-back').disabled = histIdx <= 0;
    document.getElementById('btn-forward').disabled = histIdx >= histStack.length - 1;
}
function toggleGrid() { isGrid = !isGrid; renderFiles(allFiles); }

async function createFolder() {
    const n = prompt('Folder name:');
    if (!n) return;
    const r = await apiFetch('/nas/api/mkdir', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:currentPath, name:n}) });
    const d = await r.json();
    if (d.success) refresh(); else alert(d.error);
}

async function handleUpload(input, files = null) {
    const targetFiles = files || (input.files ? Array.from(input.files) : []);
    if (!targetFiles.length) return;
    for (let f of targetFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('path', currentPath);
        await fetch('/nas/api/upload', { method:'POST', body:fd });
    }
    refresh();
}
function isEditable(name) {
    return ['txt','py','md','json','html','css','js','yml','yaml','log','sh'].includes(name.split('.').pop().toLowerCase());
}

async function openEditor(path) {
    try {
        currentEditingPath = path;
        const box = document.getElementById('monaco-box');
        box.innerHTML = '';
        const r = await apiFetch('/nas/api/read?path=' + encodeURIComponent(path));
        const content = await r.text();
        document.getElementById('editor-path').textContent = ROOT + path;
        document.getElementById('editor-overlay').style.display = 'block';
        setTimeout(() => {
            editor = monaco.editor.create(box, { value: content, language: 'plaintext', theme: 'vs-dark', automaticLayout: true });
            document.getElementById('btn-save').onclick = saveFile;
        }, 80);
    } catch(e) { alert('Error: ' + e.message); }
}

function openPdfViewer(path) {
    const overlay = document.getElementById('media-overlay');
    overlay.style.display = 'flex';
    const viewport = document.getElementById('media-viewport');
    viewport.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = '/nas/api/view?path=' + encodeURIComponent(path);
    iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
    viewport.appendChild(iframe);
}

function closeEditor() { document.getElementById('editor-overlay').style.display = 'none'; }

async function saveFile() {
    if (!currentEditingPath) return;
    const content = editor ? editor.getValue() : '';
    try {
        const r = await apiFetch('/nas/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:currentEditingPath, content}) });
        const d = await r.json();
        if (d.success) { alert('Saved!'); closeEditor(); }
    } catch(e) { alert('Error: ' + e.message); }
}
