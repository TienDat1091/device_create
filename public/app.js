const API_BASE = '/api';

const elements = {
    sheetList: document.getElementById('sheetList'),
    filesList: document.getElementById('filesList'),
    fileInput: document.getElementById('fileInput'),
    currentSheetName: document.getElementById('currentSheetName'),
    tableHead: document.getElementById('tableHead'),
    tableBody: document.getElementById('tableBody'),
    tableContainer: document.getElementById('tableContainer'),
    infoBanner: document.getElementById('infoBanner'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    refreshBtn: document.getElementById('refreshBtn'),

    // AI & Save
    aiToggleBtn: document.getElementById('aiToggleBtn'),
    aiPanel: document.getElementById('aiPanel'),
    aiPromptInput: document.getElementById('aiPromptInput'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    runAiBtn: document.getElementById('runAiBtn'),
    saveBtn: document.getElementById('saveBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    saveStatus: document.getElementById('saveStatus'),
    dbTypeSelect: document.getElementById('dbTypeSelect'),

    // SQL Gen
    genSqlBtn: document.getElementById('genSqlBtn'),
    sqlModal: document.getElementById('sqlModal'),
    sqlOutput: document.getElementById('sqlOutput'),
    closeSqlBtn: document.getElementById('closeSqlBtn'),
    copySqlBtn: document.getElementById('copySqlBtn')
};

let currentSheet = null;
let currentFile = "";
let currentData = null;
let saveTimeout = null;

// Initialize
async function init() {
    setupEventListeners();

    // Restore API Key
    const key = localStorage.getItem('gemini_api_key');
    if (key && elements.apiKeyInput) elements.apiKeyInput.value = key;

    await loadFiles();
    selectFile("");
}

function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', () => {
        if (currentSheet) loadData(currentSheet);
        else loadSheets(currentFile);
    });

    elements.fileInput.addEventListener('change', handleFileUpload);

    if (elements.aiToggleBtn) {
        elements.aiToggleBtn.addEventListener('click', () => {
            elements.aiPanel.classList.toggle('hidden');
        });
    }

    if (elements.runAiBtn) {
        elements.runAiBtn.addEventListener('click', runAiModification);
    }

    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', () => saveToFile(true));
    }

    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', downloadFile);
    }

    if (elements.genSqlBtn) {
        elements.genSqlBtn.addEventListener('click', generateSQL);
    }

    if (elements.closeSqlBtn) {
        elements.closeSqlBtn.addEventListener('click', () => {
            elements.sqlModal.style.display = 'none';
        });
    }

    if (elements.copySqlBtn) {
        elements.copySqlBtn.addEventListener('click', () => {
            elements.sqlOutput.select();
            document.execCommand('copy');
            alert("Copied to clipboard!");
        });
    }

    // Table Input for Auto-Save
    elements.tableContainer.addEventListener('input', handleTableInput);

    // Paste Event
    elements.tableContainer.addEventListener('paste', handlePaste);
}

// ... (Rest of simple functions) ...

// SQL Gen Function
async function generateSQL() {
    if (!currentFile || !currentSheet) {
        alert("Please select a file and sheet first.");
        return;
    }

    // Get selected mode from radio buttons
    const modeRadio = document.querySelector('input[name="sqlMode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'repair';

    // Get prefix replacement value (optional, 4 chars)
    const prefixInput = document.getElementById('stepPrefixInput');
    const newPrefix = prefixInput ? prefixInput.value.trim().toUpperCase() : '';

    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/generate-sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: currentFile,
                sheetName: currentSheet,
                dbType: elements.dbTypeSelect ? elements.dbTypeSelect.value : 'VNKR',
                mode: mode,
                newPrefix: newPrefix
            })
        });

        const result = await res.json();
        if (res.ok) {
            elements.sqlOutput.value = result.sql || "-- No SQL generated (Maybe no valid rows found?)";
            elements.sqlModal.style.display = 'flex';
        } else {
            alert("Generation Failed: " + result.error);
        }
    } catch (err) {
        console.error(err);
        alert("Error generating SQL");
    } finally {
        showLoading(false);
    }
}


// ... (File Upload & Listing functions remain same) ...
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            await loadFiles();
            selectFile(data.filename);
        } else {
            alert('Upload failed: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Upload error');
    } finally {
        showLoading(false);
        elements.fileInput.value = '';
    }
}

async function loadFiles() {
    try {
        const res = await fetch(`${API_BASE}/files`);
        const data = await res.json();
        elements.filesList.innerHTML = '';
        renderFileItem("", "Default File");
        data.files.forEach(filename => {
            renderFileItem(filename, filename, true);
        });
    } catch (err) {
        console.error("Failed to load files", err);
    }
}

function renderFileItem(filename, displayName, isDeletable = false) {
    const div = document.createElement('div');
    div.className = `file-item ${currentFile === filename ? 'active' : ''}`;
    div.dataset.filename = filename;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = displayName;
    nameSpan.onclick = () => selectFile(filename);
    div.appendChild(nameSpan);

    if (isDeletable) {
        const delBtn = document.createElement('span');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Delete File';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFile(filename);
        };
        div.appendChild(delBtn);
    }
    elements.filesList.appendChild(div);
}

async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete '${filename}'?`)) return;
    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        if (res.ok) {
            await loadFiles();
            if (currentFile === filename) selectFile("");
        } else {
            alert('Failed to delete');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting file');
    } finally {
        showLoading(false);
    }
}

async function selectFile(filename) {
    currentFile = filename;
    document.querySelectorAll('.file-item').forEach(el => {
        el.classList.toggle('active', el.dataset.filename === filename);
    });
    currentSheet = null;
    currentData = null;
    elements.currentSheetName.textContent = "Select a Sheet";
    elements.infoBanner.textContent = "Please select a sheet from the sidebar to view data.";
    elements.infoBanner.style.display = 'flex';
    elements.tableContainer.style.display = 'none';
    if (elements.saveBtn) elements.saveBtn.style.display = 'none';

    await loadSheets(filename);
}

async function loadSheets(filename) {
    try {
        const url = `${API_BASE}/sheets?file=${encodeURIComponent(filename)}`;
        const res = await fetch(url);
        const data = await res.json();

        elements.sheetList.innerHTML = '';
        if (data.sheets && data.sheets.length > 0) {
            data.sheets.forEach(sheet => {
                const div = document.createElement('div');
                div.className = 'sheet-item';
                div.textContent = sheet;
                div.onclick = () => selectSheet(sheet, div);
                elements.sheetList.appendChild(div);
            });
            const items = document.querySelectorAll('.sheet-item');
            const target = Array.from(items).find(el => el.textContent.toLowerCase().includes('route'));
            if (target) target.click();
        } else {
            elements.sheetList.innerHTML = '<div style="padding:10px; color:#94a3b8; font-size:0.9rem;">No sheets found</div>';
        }
    } catch (err) {
        console.error("Failed to load sheets", err);
        elements.sheetList.innerHTML = '<div style="color:tomato; padding:10px;">Error loading sheets</div>';
    }
}

async function selectSheet(sheetName, element) {
    if (currentSheet === sheetName) return;
    document.querySelectorAll('.sheet-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    currentSheet = sheetName;
    elements.currentSheetName.textContent = sheetName;
    if (elements.saveBtn) elements.saveBtn.style.display = 'none';

    await loadData(sheetName);
}

async function loadData(sheetName) {
    showLoading(true);
    elements.infoBanner.style.display = 'none';
    elements.tableContainer.style.display = 'none';
    if (elements.saveBtn) elements.saveBtn.style.display = 'block';

    try {
        const url = `${API_BASE}/data/${encodeURIComponent(sheetName)}?file=${encodeURIComponent(currentFile)}`;
        const res = await fetch(url);
        const result = await res.json();

        currentData = result.data;
        renderTable(currentData);

        elements.tableContainer.style.display = 'block';
    } catch (err) {
        console.error(err);
        elements.infoBanner.textContent = "Error loading data.";
        elements.infoBanner.style.display = 'flex';
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    elements.tableHead.innerHTML = '';
    elements.tableBody.innerHTML = '';

    if (!data || data.length === 0) {
        elements.tableBody.innerHTML = '<tr><td colspan="100%">No data found</td></tr>';
        return;
    }

    const headers = data[0];
    const rows = data.slice(1);

    const trHead = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header || '';
        trHead.appendChild(th);
    });
    elements.tableHead.appendChild(trHead);

    const fragment = document.createDocumentFragment();
    rows.forEach(row => {
        const tr = document.createElement('tr');
        for (let i = 0; i < headers.length; i++) {
            const td = document.createElement('td');
            td.contentEditable = true; // Enable Editing
            td.textContent = row[i] !== undefined ? row[i] : '';
            tr.appendChild(td);
        }
        fragment.appendChild(tr);
    });
    elements.tableBody.appendChild(fragment);
}

// Helper: Scrape data from DOM
function getDataFromTable() {
    const headers = [];
    elements.tableHead.querySelectorAll('th').forEach(th => headers.push(th.textContent));

    const rows = [];
    elements.tableBody.querySelectorAll('tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => row.push(td.textContent));
        rows.push(row);
    });

    return [headers, ...rows];
}

// Auto-Save Logic
function handleTableInput(e) {
    if (saveTimeout) clearTimeout(saveTimeout);

    if (elements.saveStatus) elements.saveStatus.textContent = 'Typing...';

    saveTimeout = setTimeout(() => {
        saveToFile(false);
    }, 5000); // 5 seconds
}

async function saveToFile(showAlert = true) {
    if (!currentSheet) return;

    const newData = getDataFromTable();
    currentData = newData;

    if (elements.saveStatus) elements.saveStatus.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_BASE}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: currentFile,
                sheetName: currentSheet,
                data: newData
            })
        });

        const result = await res.json();
        if (res.ok) {
            if (elements.saveStatus) elements.saveStatus.textContent = 'All changes saved.';
            if (showAlert) alert("File Saved Successfully!");
        } else {
            if (elements.saveStatus) elements.saveStatus.textContent = 'Save Failed!';
            if (showAlert) alert("Save Failed: " + result.error);
        }
    } catch (err) {
        console.error(err);
        if (elements.saveStatus) elements.saveStatus.textContent = 'Save Error!';
        if (showAlert) alert("Save Error");
    }
}

// Advanced Paste Logic
function handlePaste(e) {
    const clipboardData = (e.clipboardData || window.clipboardData).getData('text');
    if (!clipboardData) return;

    // Check if simple paste or multi-line/tab (excel like)
    const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.length > 0);

    // If just simple text, let default behavior happen unless it looks like table data
    if (rows.length === 1 && !rows[0].includes('\t')) {
        return; // Allow default paste
    }

    e.preventDefault();

    // Get current cell
    let target = e.target;
    // Walk up if we clicked inside a div inside td or similar, though generic TD check logic:
    while (target && target.tagName !== 'TD' && target !== elements.tableBody) {
        target = target.parentElement;
    }

    if (!target || target.tagName !== 'TD') return;

    const currentRow = target.parentElement;
    const currentRowIndex = Array.from(elements.tableBody.children).indexOf(currentRow);
    const currentCellIndex = Array.from(currentRow.children).indexOf(target);

    // Apply data
    rows.forEach((rowData, rIndex) => {
        const cells = rowData.split('\t');
        const targetRow = elements.tableBody.children[currentRowIndex + rIndex];

        if (targetRow) {
            cells.forEach((cellData, cIndex) => {
                const targetCell = targetRow.children[currentCellIndex + cIndex];
                if (targetCell) {
                    targetCell.textContent = cellData;
                }
            });
        }
    });

    // Trigger Save
    handleTableInput();
}

// AI Function
async function runAiModification() {
    const prompt = elements.aiPromptInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();

    if (!prompt) {
        alert("Please enter a prompt describing what to do.");
        return;
    }

    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
    }

    // Use current data from DOM in case user edited it manually
    currentData = getDataFromTable();

    if (!currentData || currentData.length === 0) {
        alert("No data loaded to modify.");
        return;
    }

    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/ai/modify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey,
                data: currentData,
                prompt
            })
        });

        const result = await res.json();

        if (res.ok) {
            currentData = result.data;
            renderTable(currentData);
            alert("AI Modification Applied! Review the data and click 'Save to File' to persist changes.");
            if (elements.saveBtn) elements.saveBtn.style.display = 'block';
            if (elements.aiPanel) elements.aiPanel.classList.add('hidden'); // Hide panel
            // Save state immediately? No, let user confirm via Save button or Auto-save will trigger on next edit. 
            // Actually user might want to discard AI changes, so don't auto-save immediately.
        } else {
            alert('AI Error: ' + (result.error || result.message || JSON.stringify(result)));
        }
    } catch (err) {
        console.error(err);
        alert('Request failed: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// Download
function downloadFile() {
    if (!currentFile) {
        alert("Select a file first.");
        return;
    }
    const url = `${API_BASE}/download?file=${encodeURIComponent(currentFile)}`;
    window.open(url, '_blank');
}


function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

init();
