async function handleUpload(input, files = null) {
    const targetFiles = files || (input.files ? Array.from(input.files) : []);
    if (!targetFiles.length) return;

    const container = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const percentText = document.getElementById('upload-percent');
    const filenameText = document.getElementById('upload-filename');

    container.classList.remove('hidden');

    for (const f of targetFiles) {
        filenameText.textContent = f.name;
        
        await new Promise((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('path', currentPath);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/nas/api/upload');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    percentText.textContent = percent + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const d = JSON.parse(xhr.responseText);
                        if (d.success) resolve(); else reject(new Error(d.error));
                    } catch (e) { reject(e); }
                } else { reject(new Error('Upload failed')); }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(fd);
        });
    }

    container.classList.add('hidden');
    progressBar.style.width = '0%';
    percentText.textContent = '0%';
    refresh();
}
