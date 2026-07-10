/* Drag and Drop Implementation */
document.getElementById('app').addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('app').style.background = 'rgba(255,255,255,0.05)';
});

document.getElementById('app').addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('app').style.background = '';
});

document.getElementById('app').addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('app').style.background = '';
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        handleUpload(null, files);
    }
});
