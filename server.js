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
            return res.json({ files: [] });
        }
        const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
        res.json({ files });
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
        if (filename && !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        const workbook = XLSX.readFile(filePath);
        res.json({ sheets: workbook.SheetNames });
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
        if (filename && !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
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
                if (r.RTYPE2 === 'R' && r.MSTEP && r.MSTEP !== '0') {
                    const mStepStr = r.MSTEP.toString().trim();
                    const sourceGrp = mStepStr.length > 5 ? mStepStr.slice(5) : mStepStr;
                    if (grp) {
                        if (!pairCounts[sourceGrp]) pairCounts[sourceGrp] = {};
                        pairCounts[sourceGrp][grp] = (pairCounts[sourceGrp][grp] || 0) + 1;
                    }
                }
            });
            for (const src in pairCounts) {
                const targets = pairCounts[src];
                db.repairFrequencyMap.set(src, Object.keys(targets).reduce((a, b) => targets[a] > targets[b] ? a : b));
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
        const { filename, sheetName, dbType } = req.body;
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

        rawData.forEach(row => {
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
            const basePrefix = originalStep.length >= 4 ? originalStep.slice(0, 4) : "MHBI";
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

            if (!knowledgeFound) {
                const searchStepName = `${basePrefix}${getPrefix(firstSourceGrp, originalSection)}${firstSourceGrp}`;
                const idx = routeAllData.findIndex(r => r.ROUTE === route && (r.STEP === searchStepName || r.STEPNM === searchStepName));
                if (idx !== -1 && idx + 1 < routeAllData.length && routeAllData[idx + 1].ROUTE === route) {
                    targetGrp = routeAllData[idx + 1].GRP;
                    knowledgeFound = true;
                } else {
                    targetGrp = firstSourceGrp + "1";
                }
            }

            const targetSecPrefix = getPrefix(targetGrp, originalSection);
            const targetSecName = grpToSectionMap.get(targetGrp) || originalSection;
            const getFinalName = (pref, mid, grp) => knowledgeFound ? `${pref}${mid}${grp}` : pref;

            const repairStepFinal = getFinalName(basePrefix, targetSecPrefix, targetGrp);
            const targetRollbackFirst = getFinalName(basePrefix, alphaSeq[0], targetGrp);
            const columns = `ROUTE,RIDX,STEP,STEPTIME,TIMESTEP,STEPSTAY,LOWSTEPTIME,LOWTIMESTEP,RTYPE1,RTYPE2,RTYPE3,MSTEP,OSTEP,SECTION,GRP,STEPFLAG,STEPFLAG1,STEPFLAG2,STEPFLAG3,KP1,KP2,KP3,TOKP,CHKKP1,CHKKP2,KPMODE,STEPNM`;

            let currentRidx = originalRidx * 10000;
            repairGrpsList.forEach((currentGrp, i) => {
                const currentSourceStep = getFinalName(basePrefix, getPrefix(currentGrp, originalSection), currentGrp);
                const mStepSeq = getFinalName(basePrefix, alphaSeq[i % alphaSeq.length], targetGrp);

                if (i === 0) {
                    currentRidx++;
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${repairStepFinal}',0,0,0,0,0,'','R','','${targetRollbackFirst}','0','${targetSecName}','${currentGrp}','','','','','','','','','','','','');\n`;
                    currentRidx++;
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${basePrefix}BZZZ',0,0,0,0,0,'','B','','${mStepSeq}','${currentSourceStep}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                } else {
                    currentRidx++;
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${basePrefix}BZZZ',0,0,0,0,0,'','B','','${mStepSeq}','${currentSourceStep}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                }
            });
            sqlOutput += "\n";
            useCount++;
        });
        res.json({ sql: sqlOutput, count: rawData.length, info: `Generated ${useCount} Auto, ${ruleCount} from Rules.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
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
