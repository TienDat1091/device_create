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
    copySqlBtn: document.getElementById('copySqlBtn'),

    // Compare Files
    compareBtn: document.getElementById('compareBtn'),
    compareModal: document.getElementById('compareModal'),
    closeCompareBtn: document.getElementById('closeCompareBtn'),
    compareFile1: document.getElementById('compareFile1'),
    compareSheet1: document.getElementById('compareSheet1'),
    compareFile2: document.getElementById('compareFile2'),
    compareSheet2: document.getElementById('compareSheet2'),
    runCompareBtn: document.getElementById('runCompareBtn'),
    compareResults: document.getElementById('compareResults'),
    compareSummary: document.getElementById('compareSummary'),
    compareDetails: document.getElementById('compareDetails')
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

    // Compare Files
    if (elements.compareBtn) {
        elements.compareBtn.addEventListener('click', openCompareModal);
    }

    if (elements.closeCompareBtn) {
        elements.closeCompareBtn.addEventListener('click', () => {
            elements.compareModal.style.display = 'none';
        });
    }

    if (elements.runCompareBtn) {
        elements.runCompareBtn.addEventListener('click', runComparison);
    }

    if (elements.compareFile1) {
        elements.compareFile1.addEventListener('change', (e) => loadSheetsForCompare(e.target.value, 1));
    }

    if (elements.compareFile2) {
        elements.compareFile2.addEventListener('change', (e) => loadSheetsForCompare(e.target.value, 2));
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
        const files = await res.json();
        elements.filesList.innerHTML = '';
        renderFileItem("", "Default File");
        files.forEach(file => {
            renderFileItem(file.filename, file.displayName, true);
        });
    } catch (err) {
        console.error("Failed to load files", err);
    }
}

function renderFileItem(filename, displayName, isDeletable = false) {
    const div = document.createElement('div');
    div.className = `file-item ${currentFile === filename ? 'active' : ''}`;
    div.dataset.filename = filename;
    div.style.cursor = 'pointer';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = displayName;
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

    // Add click handler to entire div
    div.onclick = (e) => {
        // Ignore if clicking delete button
        if (e.target.classList.contains('delete-btn')) return;
        selectFile(filename);
    };

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
        const sheets = await res.json();

        elements.sheetList.innerHTML = '';
        if (sheets && sheets.length > 0) {
            sheets.forEach(sheet => {
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

// Compare Files Functions
async function openCompareModal() {
    // Populate file dropdowns
    try {
        const res = await fetch(`${API_BASE}/files`);
        const files = await res.json();

        const fileOptions = files.map(f => `<option value="${f.filename}">${f.displayName}</option>`).join('');
        elements.compareFile1.innerHTML = '<option value="">Select File 1...</option>' + fileOptions;
        elements.compareFile2.innerHTML = '<option value="">Select File 2...</option>' + fileOptions;

        elements.compareModal.style.display = 'flex';
        elements.compareResults.style.display = 'none';
    } catch (err) {
        alert('Failed to load files: ' + err.message);
    }
}

async function loadSheetsForCompare(filename, fileNum) {
    if (!filename) return;

    try {
        const res = await fetch(`${API_BASE}/sheets?file=${encodeURIComponent(filename)}`);
        const sheets = await res.json();

        const sheetOptions = sheets.map(s => `<option value="${s}">${s}</option>`).join('');
        const selectElement = fileNum === 1 ? elements.compareSheet1 : elements.compareSheet2;
        selectElement.innerHTML = `<option value="">Select Sheet ${fileNum}...</option>` + sheetOptions;
    } catch (err) {
        alert(`Failed to load sheets for File ${fileNum}: ` + err.message);
    }
}

async function runComparison() {
    const file1 = elements.compareFile1.value;
    const sheet1 = elements.compareSheet1.value;
    const file2 = elements.compareFile2.value;
    const sheet2 = elements.compareSheet2.value;

    if (!file1 || !sheet1 || !file2 || !sheet2) {
        alert('Please select both files and sheets to compare.');
        return;
    }

    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/compare-files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file1, sheet1, file2, sheet2,
                keyColumns: ['ROUTE', 'RIDX']
            })
        });

        const result = await res.json();

        if (res.ok) {
            displayComparisonResults(result);
        } else {
            alert('Comparison failed: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error during comparison: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function displayComparisonResults(result) {
    const { summary, differences } = result;

    // Display summary
    elements.compareSummary.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">📊 Comparison Summary</h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.9rem;">
            <div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 4px; border-left: 3px solid #10b981;">
                <div style="color: #10b981; font-weight: bold;">${summary.matchingRows}</div>
                <div style="color: #94a3b8;">Matching Rows</div>
            </div>
            <div style="background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 4px; border-left: 3px solid #ef4444;">
                <div style="color: #ef4444; font-weight: bold;">${summary.differentRows}</div>
                <div style="color: #94a3b8;">Different Rows</div>
            </div>
            <div style="background: rgba(245, 158, 11, 0.1); padding: 10px; border-radius: 4px; border-left: 3px solid #f59e0b;">
                <div style="color: #f59e0b; font-weight: bold;">${summary.onlyInFile1 + summary.onlyInFile2}</div>
                <div style="color: #94a3b8;">Missing/Extra Rows</div>
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 0.85rem; color: #94a3b8;">
            Total: ${summary.totalRows1} rows in File 1, ${summary.totalRows2} rows in File 2
        </div>
    `;

    // Display differences
    if (differences.length === 0) {
        elements.compareDetails.innerHTML = '<div style="text-align: center; padding: 20px; color: #10b981;">✅ Files are identical!</div>';
    } else {
        let detailsHTML = '<div style="font-size: 0.85rem;">';
        differences.forEach(diff => {
            const statusColor = diff.status === 'different' ? '#ef4444' : '#f59e0b';
            const statusText = diff.status === 'different' ? 'Different Values' : (diff.status === 'missing' ? 'Only in File 1' : 'Only in File 2');

            detailsHTML += `
                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid ${statusColor};">
                    <div style="font-weight: bold; color: ${statusColor}; margin-bottom: 5px;">
                        ${statusText}: ROUTE=${diff.key.ROUTE}, RIDX=${diff.key.RIDX}
                    </div>
            `;

            if (diff.status === 'different' && diff.diffColumns) {
                detailsHTML += '<div style="margin-top: 8px;">';
                diff.diffColumns.forEach(col => {
                    const val1 = diff.file1Values[col] !== undefined ? diff.file1Values[col] : 'N/A';
                    const val2 = diff.file2Values[col] !== undefined ? diff.file2Values[col] : 'N/A';
                    detailsHTML += `
                        <div style="margin-bottom: 5px; padding-left: 10px;">
                            <span style="color: #94a3b8;">${col}:</span> 
                            <span style="color: #10b981;">${val1}</span> 
                            <span style="color: #64748b;">→</span> 
                            <span style="color: #ef4444;">${val2}</span>
                        </div>
                    `;
                });
                detailsHTML += '</div>';
            }

            detailsHTML += '</div>';
        });
        detailsHTML += '</div>';

        elements.compareDetails.innerHTML = detailsHTML;
    }

    elements.compareResults.style.display = 'block';
}

init();
