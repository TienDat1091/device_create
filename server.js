const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing (increase limit for large data)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Health check endpoint
app.get('/api/ping', (req, res) => res.send('pong'));

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DEFAULT_FILE = path.join(__dirname, 'Ho tro tao all - Copy - Copy.xlsx');

const getFilePath = (filename) => {
    if (!filename) return DEFAULT_FILE;
    return path.join(UPLOADS_DIR, filename);
};

// API: List uploaded files
app.get('/api/files', (req, res) => {
    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            return res.json([]);
        }
        const files = fs.readdirSync(UPLOADS_DIR)
            .filter(f => !f.startsWith('.'))
            .map(filename => ({
                filename: filename,
                displayName: filename
            }));
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// API: Delete file
app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            res.json({ message: 'File deleted' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get list of sheets
app.get('/api/sheets', (req, res) => {
    try {
        const filename = req.query.file;
        const filePath = getFilePath(filename);
        if (!fs.existsSync(filePath)) return res.json([]); // Return empty array if file not found (e.g. default file missing)
        const workbook = XLSX.readFile(filePath);
        res.json(workbook.SheetNames);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get data from a specific sheet
app.get('/api/data/:sheetName', (req, res) => {
    try {
        const sheetName = req.params.sheetName;
        const filename = req.query.file;
        const filePath = getFilePath(filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        const workbook = XLSX.readFile(filePath);
        if (!workbook.SheetNames.includes(sheetName)) return res.status(404).json({ error: 'Sheet not found' });
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        res.json({ data: jsonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Modify Data with Gemini
app.post('/api/ai/modify', async (req, res) => {
    try {
        const { apiKey, data, prompt } = req.body;
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) return res.status(400).json({ error: 'API Key is required' });
        if (!data || data.length === 0) return res.status(400).json({ error: 'No data provided' });
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }, { apiVersion: 'v1beta' });
        const systemInstruction = `You are a data processing expert. Return ONLY valid JSON array of arrays. No markdown. Original prompt: "${prompt}"`;
        const result = await model.generateContent([systemInstruction, JSON.stringify(data.slice(0, 200))]);
        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json({ data: JSON.parse(text) });
    } catch (error) {
        res.status(500).json({ error: error.message || "AI processing failed" });
    }
});

// API: Save Data
app.post('/api/save', (req, res) => {
    try {
        const { filename, sheetName, data } = req.body;
        const filePath = getFilePath(filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Target file not found for saving' });
        const workbook = XLSX.readFile(filePath);
        workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data);
        XLSX.writeFile(workbook, filePath);
        res.json({ message: 'Saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Download
app.get('/api/download', (req, res) => {
    try {
        const filename = req.query.file;
        const filePath = getFilePath(filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const ROUTE_ALL_PATH = path.join(__dirname, 'ROUTE_ALL.xls');
const VNFB_PATH = path.join(__dirname, 'VNFB.xls');
const TAOREPAIR_PATH = path.join(__dirname, 'Ho tro tao all - Copy - Copy.xlsx');

const knowledgeBase = {
    VNKR: { routeAllData: [], repairFrequencyMap: new Map(), grpToSectionMap: new Map() },
    VNFB: { routeAllData: [], repairFrequencyMap: new Map(), grpToSectionMap: new Map() }
};
let taoRepairMap = new Map();

const loadKnowledgeFromFile = (filePath, dbKey) => {
    if (fs.existsSync(filePath)) {
        try {
            const db = knowledgeBase[dbKey];
            const wb = XLSX.readFile(filePath);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            db.routeAllData = XLSX.utils.sheet_to_json(sheet);
            const pairCounts = {};
            db.routeAllData.forEach(r => {
                const grp = r.GRP ? r.GRP.toString().trim() : null;
                const section = r.SECTION ? r.SECTION.toString().trim() : null;
                if (grp && section) db.grpToSectionMap.set(grp, section);

                // Statistical Learning from Rollback Rows (EXPLICIT SOURCE -> TARGET)
                if (r.RTYPE2 === 'B' && r.MSTEP && r.OSTEP && r.MSTEP !== '0' && r.OSTEP !== '0') {
                    const mStepStr = r.MSTEP.toString().trim();
                    const oStepStr = r.OSTEP.toString().trim();

                    // In a rollback row:
                    // OSTEP = The station being rolled back (SOURCE) e.g. UDUPTTVI -> GRP: TVI
                    // MSTEP = The station it rolls back TO (TARGET) e.g. UDUPTTVJ -> GRP: TVJ
                    // We extract GRP from the last 3 chars as per the naming pattern seen in debug logs
                    const sourceGrp = oStepStr.length >= 3 ? oStepStr.slice(-3) : oStepStr;
                    const targetGrp = mStepStr.length >= 3 ? mStepStr.slice(-3) : mStepStr;

                    if (sourceGrp && targetGrp && sourceGrp !== 'ZZZ' && targetGrp !== 'ZZZ') {
                        if (!pairCounts[sourceGrp]) pairCounts[sourceGrp] = {};
                        pairCounts[sourceGrp][targetGrp] = (pairCounts[sourceGrp][targetGrp] || 0) + 1;
                    }
                }
            });
            for (const src in pairCounts) {
                const targets = pairCounts[src];
                const mostFrequent = Object.keys(targets).reduce((a, b) => targets[a] > targets[b] ? a : b);
                db.repairFrequencyMap.set(src, mostFrequent);
            }
            console.log(`Knowledge Base [${dbKey}] loaded: ${db.routeAllData.length} rows.`);
        } catch (e) { console.error(`Failed to load ${dbKey}`, e); }
    }
};

const loadAuxiliaryData = () => {
    loadKnowledgeFromFile(ROUTE_ALL_PATH, 'VNKR');
    loadKnowledgeFromFile(VNFB_PATH, 'VNFB');
    if (fs.existsSync(TAOREPAIR_PATH)) {
        try {
            const wb = XLSX.readFile(TAOREPAIR_PATH);
            const sheet = wb.Sheets["TaoRepair"];
            if (sheet) {
                XLSX.utils.sheet_to_json(sheet).forEach(row => {
                    if (row.ROUTE && row.RIDX && row['CODE SQL']) taoRepairMap.set(`${row.ROUTE}_${row.RIDX}`, row['CODE SQL']);
                });
            }
        } catch (e) { console.error("Failed to load TaoRepair", e); }
    }
};
loadAuxiliaryData();

app.post('/api/generate-sql', (req, res) => {
    try {
        const { filename, sheetName, dbType, mode, newPrefix } = req.body;
        const selectedDB = knowledgeBase[dbType] || knowledgeBase.VNKR;
        const { routeAllData, repairFrequencyMap, grpToSectionMap } = selectedDB;
        const filePath = getFilePath(filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        const workbook = XLSX.readFile(filePath);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let sqlOutput = "";
        let sqlEntryCount = 0;
        let useCount = 0;
        let ruleCount = 0;

        // Helper function to replace first 4 chars of a step name
        const replacePrefix = (stepName, newPrefix) => {
            if (!newPrefix || newPrefix.length !== 4) return stepName;
            if (!stepName || stepName.toString().trim() === '0') return stepName;
            const step = stepName.toString().trim();
            if (step.length < 4) return step;
            return newPrefix + step.substring(4);
        };

        // NORMAL MODE: Generate simple INSERT statements for regular stations (RIDX 1-999)
        if (mode === 'normal') {
            const columns = `ROUTE,RIDX,STEP,STEPTIME,TIMESTEP,STEPSTAY,LOWSTEPTIME,LOWTIMESTEP,RTYPE1,RTYPE2,RTYPE3,MSTEP,OSTEP,SECTION,GRP,STEPFLAG,STEPFLAG1,STEPFLAG2,STEPFLAG3,KP1,KP2,KP3,TOKP,CHKKP1,CHKKP2,KPMODE,STEPNM`;

            rawData.forEach(row => {
                const stepValue = row.STEP || row.STEPNM || '';
                const ridx = parseInt(row.RIDX);

                // Filter: RIDX 1-999 (exclude RIDX with 4+ trailing zeros like 80001, 100001)
                if (!row.RIDX || !row.ROUTE || isNaN(ridx) || ridx >= 10000) return;

                sqlEntryCount++;
                sqlOutput += `-- No: ${sqlEntryCount}\n`;

                // Read ALL columns from Excel row
                const route = (row.ROUTE || '').toString();
                const step = replacePrefix(stepValue.toString().trim(), newPrefix);
                const steptime = row.STEPTIME || 0;
                const timestep = row.TIMESTEP || 0;
                const stepstay = row.STEPSTAY || 0;
                const lowsteptime = row.LOWSTEPTIME || 0;
                const lowtimestep = row.LOWTIMESTEP || 0;
                const rtype1 = (row.RTYPE1 || '').toString();
                const rtype2 = (row.RTYPE2 || 'N').toString();
                const rtype3 = (row.RTYPE3 || '').toString();
                const mstep = replacePrefix((row.MSTEP || '0').toString(), newPrefix);
                const ostep = replacePrefix((row.OSTEP || '0').toString(), newPrefix);
                const section = (row.SECTION || '').toString();
                const grp = (row.GRP || '').toString();
                const stepflag = (row.STEPFLAG || '').toString();
                const stepflag1 = (row.STEPFLAG1 || '').toString();
                const stepflag2 = (row.STEPFLAG2 || '').toString();
                const stepflag3 = (row.STEPFLAG3 || '').toString();
                const kp1 = (row.KP1 || '').toString();
                const kp2 = (row.KP2 || '').toString();
                const kp3 = (row.KP3 || '').toString();
                const tokp = (row.TOKP || '').toString();
                const chkkp1 = (row.CHKKP1 || '').toString();
                const chkkp2 = (row.CHKKP2 || '').toString();
                const kpmode = (row.KPMODE || '').toString();
                const stepnm = (row.STEPNM || '').toString();

                sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${ridx}','${step}',${steptime},${timestep},${stepstay},${lowsteptime},${lowtimestep},'${rtype1}','${rtype2}','${rtype3}','${mstep}','${ostep}','${section}','${grp}','${stepflag}','${stepflag1}','${stepflag2}','${stepflag3}','${kp1}','${kp2}','${kp3}','${tokp}','${chkkp1}','${chkkp2}','${kpmode}','${stepnm}');\n\n`;
                useCount++;
            });

            return res.json({ sql: sqlOutput, count: rawData.length, info: `Generated ${useCount} Normal Stations${newPrefix ? ` (Prefix: ${newPrefix})` : ''}` });
        }

        // REPAIR-ROLLBACK MODE: Existing complex logic
        rawData.forEach((row, rowIndex) => {
            const stepValue = row.STEP || row.STEPNM;
            if (!row.RIDX || !stepValue || !row.ROUTE || !row.REPAIR) return;

            sqlEntryCount++;
            sqlOutput += `-- No: ${sqlEntryCount}\n`;
            const originalRidx = parseInt(row.RIDX);
            const originalStep = stepValue.toString().trim();
            const route = row.ROUTE;
            const ruleKey = `${route}_${originalRidx}`;

            if (taoRepairMap.has(ruleKey)) {
                sqlOutput += `-- Rule from TaoRepair\n${taoRepairMap.get(ruleKey)}\n\n`;
                ruleCount++;
                return;
            }

            const originalSection = (row.SECTION || "").toString().trim();
            const originalPrefix = originalStep.length >= 4 ? originalStep.slice(0, 4) : "MHBI";
            const basePrefix = (newPrefix && newPrefix.length === 4) ? newPrefix : originalPrefix;
            const alphaSeq = ['Z', 'Y', 'X', 'V', 'W', 'M', 'N', 'J', 'K', 'L'];

            const getPrefix = (grp, fallback) => {
                const sec = grpToSectionMap.get(grp);
                return sec ? sec.charAt(0).toUpperCase() : (fallback ? fallback.charAt(0).toUpperCase() : "X");
            };

            const repairGrpsList = row.REPAIR.toString().split(/[，,;]/).map(s => s.trim()).filter(s => s.length > 0);
            if (repairGrpsList.length === 0) return;

            const firstSourceGrp = repairGrpsList[0];
            let targetGrp = repairFrequencyMap.get(firstSourceGrp);
            let knowledgeFound = !!targetGrp;

            // NEW: Local Self-Repair Check
            // If explicit global knowledge is missing, check if this GRP exists locally in the current route.
            // If it does, assume it repairs to ITSELF (Self-Repair).
            if (!knowledgeFound) {
                const localSelfMatch = rawData.find(r => r.ROUTE === route && r.GRP && r.GRP.toString().trim() === firstSourceGrp);
                if (localSelfMatch) {
                    targetGrp = firstSourceGrp; // Self-repair: TBE -> TBE
                    knowledgeFound = true;
                }
            }

            if (!knowledgeFound) {
                // FALLBACK SEARCH: Only use if no Global Rule was found

                // 1. Search in CURRENT SHEET (rawData) first for NEXT station
                const currentSearchStep = originalStep;
                const localIdx = rawData.findIndex(r => r.ROUTE === route && (r.STEP === currentSearchStep || r.STEPNM === currentSearchStep));
                if (localIdx !== -1 && localIdx + 1 < rawData.length && rawData[localIdx + 1].ROUTE === route) {
                    targetGrp = rawData[localIdx + 1].GRP;
                    knowledgeFound = true;
                } else {
                    // 2. Search in GLOBAL Knowledge Base
                    const searchStepName = `${basePrefix}${getPrefix(firstSourceGrp, originalSection)}${firstSourceGrp}`;
                    const globalIdx = routeAllData.findIndex(r => r.ROUTE === route && (r.STEP === searchStepName || r.STEPNM === searchStepName));
                    if (globalIdx !== -1 && globalIdx + 1 < routeAllData.length && routeAllData[globalIdx + 1].ROUTE === route) {
                        targetGrp = routeAllData[globalIdx + 1].GRP;
                        knowledgeFound = true;
                    } else {
                        targetGrp = firstSourceGrp + "1"; // Fallback placeholder
                        knowledgeFound = false;
                    }
                }
            }

            // Fix: If targetGrp is undefined/null here, fallback to source
            if (!targetGrp) targetGrp = firstSourceGrp;

            const targetSecPrefix = getPrefix(targetGrp, originalSection);
            const targetSecName = grpToSectionMap.get(targetGrp) || originalSection;

            // Generate full name regardless of knowledgeFound flag (flag now only indicates level of confidence)
            const buildName = (pref, mid, grp) => `${pref}${mid}${grp}`;

            const repairStepFinal = buildName(basePrefix, targetSecPrefix, targetGrp);

            // CRITICAL: MSTEP logic depends on number of sources
            // - Single source (e.g., TBA): Use source+Z (ICP8ZTBA)
            // - Multiple sources (e.g., TVK,TVI,TBA): Use target+Z (IC4PZTVL)
            const repairMStepGrp = repairGrpsList.length === 1 ? firstSourceGrp : targetGrp;
            const targetRollbackFirstStep = buildName(basePrefix, alphaSeq[0], repairMStepGrp);

            const columns = `ROUTE,RIDX,STEP,STEPTIME,TIMESTEP,STEPSTAY,LOWSTEPTIME,LOWTIMESTEP,RTYPE1,RTYPE2,RTYPE3,MSTEP,OSTEP,SECTION,GRP,STEPFLAG,STEPFLAG1,STEPFLAG2,STEPFLAG3,KP1,KP2,KP3,TOKP,CHKKP1,CHKKP2,KPMODE,STEPNM`;

            let currentRidx = originalRidx * 10000;
            repairGrpsList.forEach((currentGrp, i) => {
                const currentSourceSecPrefix = getPrefix(currentGrp, originalSection);
                const currentSourceStepFull = buildName(basePrefix, currentSourceSecPrefix, currentGrp);
                const mStepSeq = buildName(basePrefix, alphaSeq[i % alphaSeq.length], targetGrp);

                if (i === 0) {
                    currentRidx++;
                    // Repair Row: GRP is TARGET (where repair happens), MSTEP is target-Z
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${repairStepFinal}',0,0,0,0,0,'','R','','${targetRollbackFirstStep}','0','${targetSecName}','${targetGrp}','','','','','','','','','','','','');\n`;
                    currentRidx++;
                    // Rollback 1: MSTEP is target-Seq, OSTEP is source-full
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${basePrefix}BZZZ',0,0,0,0,0,'','B','','${mStepSeq}','${currentSourceStepFull}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                } else {
                    currentRidx++;
                    // Subsequent Rollbacks: MSTEP is target-Seq, OSTEP is source-full
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${basePrefix}BZZZ',0,0,0,0,0,'','B','','${mStepSeq}','${currentSourceStepFull}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                }
            });
            sqlOutput += "\n";
            useCount++;
        });
        res.json({ sql: sqlOutput, count: rawData.length, info: `Generated ${useCount} Auto, ${ruleCount} from Rules.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/compare-files', (req, res) => {
    try {
        const { file1, sheet1, file2, sheet2, keyColumns = ['ROUTE', 'RIDX'] } = req.body;

        const filePath1 = getFilePath(file1);
        const filePath2 = getFilePath(file2);

        if (!fs.existsSync(filePath1)) return res.status(404).json({ error: 'File 1 not found' });
        if (!fs.existsSync(filePath2)) return res.status(404).json({ error: 'File 2 not found' });

        const workbook1 = XLSX.readFile(filePath1);
        const workbook2 = XLSX.readFile(filePath2);

        const data1 = XLSX.utils.sheet_to_json(workbook1.Sheets[sheet1]);
        const data2 = XLSX.utils.sheet_to_json(workbook2.Sheets[sheet2]);

        // Create maps indexed by key columns
        const createKey = (row) => keyColumns.map(col => String(row[col] || '')).join('|');

        const map1 = new Map();
        const map2 = new Map();

        data1.forEach(row => map1.set(createKey(row), row));
        data2.forEach(row => map2.set(createKey(row), row));

        const differences = [];
        let matchingRows = 0;
        let differentRows = 0;

        // Compare rows in file1
        map1.forEach((row1, key) => {
            if (!map2.has(key)) {
                // Row only in file1
                const keyObj = {};
                keyColumns.forEach((col, i) => keyObj[col] = key.split('|')[i]);
                differences.push({
                    key: keyObj,
                    status: 'missing',
                    file1Values: row1,
                    file2Values: null
                });
            } else {
                // Row exists in both, compare values
                const row2 = map2.get(key);
                const allColumns = [...new Set([...Object.keys(row1), ...Object.keys(row2)])];
                const diffColumns = [];

                allColumns.forEach(col => {
                    const val1 = String(row1[col] !== undefined ? row1[col] : '');
                    const val2 = String(row2[col] !== undefined ? row2[col] : '');
                    if (val1 !== val2) {
                        diffColumns.push(col);
                    }
                });

                if (diffColumns.length > 0) {
                    const keyObj = {};
                    keyColumns.forEach((col, i) => keyObj[col] = key.split('|')[i]);
                    differences.push({
                        key: keyObj,
                        status: 'different',
                        diffColumns,
                        file1Values: row1,
                        file2Values: row2
                    });
                    differentRows++;
                } else {
                    matchingRows++;
                }
            }
        });

        // Find rows only in file2
        map2.forEach((row2, key) => {
            if (!map1.has(key)) {
                const keyObj = {};
                keyColumns.forEach((col, i) => keyObj[col] = key.split('|')[i]);
                differences.push({
                    key: keyObj,
                    status: 'extra',
                    file1Values: null,
                    file2Values: row2
                });
            }
        });

        const summary = {
            totalRows1: data1.length,
            totalRows2: data2.length,
            matchingRows,
            differentRows,
            onlyInFile1: Array.from(map1.keys()).filter(k => !map2.has(k)).length,
            onlyInFile2: Array.from(map2.keys()).filter(k => !map1.has(k)).length
        };

        res.json({ summary, differences });
    } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    if (EXTERNAL_URL) {
        setInterval(() => {
            https.get(`${EXTERNAL_URL}/api/ping`, (res) => console.log(`Self-ping: ${res.statusCode}`)).on('error', (e) => console.error(e.message));
        }, 600000);
    }
});
