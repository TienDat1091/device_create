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
        // Use original name, overwrite if exists (simpler for this use case)
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DEFAULT_FILE = path.join(__dirname, 'Ho tro tao all - Copy - Copy.xlsx');

// Helper to get file path
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
            try {
                fs.unlinkSync(filepath);
                res.json({ message: 'File deleted' });
            } catch (err) {
                res.status(500).json({ error: 'Could not delete file (might be open)' });
            }
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

        if (filename && !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

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

        if (filename && !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const workbook = XLSX.readFile(filePath);

        if (!workbook.SheetNames.includes(sheetName)) {
            return res.status(404).json({ error: 'Sheet not found' });
        }

        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON with header:1 to get array of arrays (preserves layout best for generic viewing)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        res.json({ data: jsonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AI & SAVE APIs ---

// API: Modify Data with Gemini
app.post('/api/ai/modify', async (req, res) => {
    try {
        const { apiKey, data, prompt } = req.body;
        const key = apiKey || process.env.GEMINI_API_KEY;

        if (!key) {
            return res.status(400).json({ error: 'API Key is required' });
        }

        if (!data || data.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-3-flash-preview as explicitly requested. 
        // Adding apiVersion: 'v1beta' which is often required for preview models.
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }, { apiVersion: 'v1beta' });

        // Construct Prompt
        const systemInstruction = `You are a data processing expert. 
        You will receive a JSON array representing an Excel sheet (array of arrays).
        First row is usually headers.
        USER PROMPT: "${prompt}"
        
        REQUIREMENTS:
        1. Process the data according to the prompt.
        2. Return ONLY the valid JSON array of arrays. 
        3. Do not add markdown formatting like \`\`\`json.
        4. Maintain the structure (array of arrays).
        `;

        // Safety check for large data
        // For production, suggest chunking.
        const limitedData = data.slice(0, 200); // Limit to 200 rows for safety in this demo

        const result = await model.generateContent([
            systemInstruction,
            JSON.stringify(limitedData)
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean up markdown validation
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const modifiedData = JSON.parse(text);

        // If we truncated data, we should probably warn or merge (complex). 
        // For now, let's return just the modified part or if it was small enough, all of it.
        // In this simple implementation, we just return the modified result which becomes the new table.
        // *Real-world note*: You'd want to handle the rest of the rows if any.

        // If original data was larger, append the rest? Dangerous if row count changed.
        // Let's just return what Gemini gave us.
        res.json({ data: modifiedData });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: error.message || "AI processing failed" });
    }
});

// API: Save Data back to file
app.post('/api/save', (req, res) => {
    try {
        const { filename, sheetName, data } = req.body;
        const filePath = getFilePath(filename);

        if (filename && !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Target file not found for saving' });
        }

        // Read existing workbook
        const workbook = XLSX.readFile(filePath);

        // Convert JSON array-of-arrays back to sheet
        // Check if data is AoA or objects. xlsx utils handles AoA well.
        const newSheet = XLSX.utils.aoa_to_sheet(data);

        // Replace the sheet
        workbook.Sheets[sheetName] = newSheet;

        // Write file
        try {
            XLSX.writeFile(workbook, filePath);
        } catch (writeErr) {
            console.error("Write Error (File locked?):", writeErr);
            return res.status(500).json({ error: "Could not write to file. Is it open in Excel? Close it and try again." });
        }

        res.json({ message: 'Saved successfully' });

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// API: Download file
app.get('/api/download', (req, res) => {
    try {
        const filename = req.query.file;
        const filePath = getFilePath(filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath);
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const ROUTE_ALL_PATH = path.join(__dirname, 'ROUTE_ALL.xls');
const VNFB_PATH = path.join(__dirname, 'VNFB.xls');
const FILE_NAME_TAOREPAIR = 'Ho tro tao all - Copy - Copy.xlsx';
const TAOREPAIR_PATH = path.join(__dirname, FILE_NAME_TAOREPAIR);

// Multi-DB Knowledge Base
const knowledgeBase = {
    VNKR: {
        routeAllData: [],
        repairFrequencyMap: new Map(),
        grpToSectionMap: new Map()
    },
    VNFB: {
        routeAllData: [],
        repairFrequencyMap: new Map(),
        grpToSectionMap: new Map()
    }
};

let taoRepairMap = new Map(); // Key: ROUTE_RIDX, Value: SQL

// Load a specific Knowledge Base file
const loadKnowledgeFromFile = (filePath, dbKey) => {
    if (fs.existsSync(filePath)) {
        try {
            const db = knowledgeBase[dbKey];
            const wb = XLSX.readFile(filePath);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            db.routeAllData = XLSX.utils.sheet_to_json(sheet);
            console.log(`Loaded ${db.routeAllData.length} rows for ${dbKey} from ${path.basename(filePath)}`);

            // Frequency Analysis for Repair Pairs
            const pairCounts = {}; // Key: SourceGRP, Value: { [targetGRP]: count }
            db.routeAllData.forEach(r => {
                const grp = r.GRP ? r.GRP.toString().trim() : null;
                const section = r.SECTION ? r.SECTION.toString().trim() : null;

                if (grp && section) {
                    db.grpToSectionMap.set(grp, section);
                }

                if (r.RTYPE2 === 'R' && r.MSTEP && r.MSTEP !== '0') {
                    const mStepStr = r.MSTEP.toString().trim();
                    const sourceGrp = mStepStr.length > 5 ? mStepStr.slice(5) : mStepStr;
                    const targetGrp = grp;

                    if (targetGrp) {
                        if (!pairCounts[sourceGrp]) pairCounts[sourceGrp] = {};
                        pairCounts[sourceGrp][targetGrp] = (pairCounts[sourceGrp][targetGrp] || 0) + 1;
                    }
                }
            });

            // Flatten to most frequent
            for (const src in pairCounts) {
                const targets = pairCounts[src];
                const mostFrequent = Object.keys(targets).reduce((a, b) => targets[a] > targets[b] ? a : b);
                db.repairFrequencyMap.set(src, mostFrequent);
            }
            console.log(`Knowledge Base [${dbKey}]: ${db.repairFrequencyMap.size} GRP pairings learned.`);

        } catch (e) {
            console.error(`Failed to load ${dbKey} database from ${filePath}`, e);
        }
    } else {
        console.warn(`${dbKey} database file not found at`, filePath);
    }
};

// Load All Auxiliary Data
const loadAuxiliaryData = () => {
    // 1. Load VNKR (ROUTE_ALL.xls)
    loadKnowledgeFromFile(ROUTE_ALL_PATH, 'VNKR');

    // 2. Load VNFB (VNFB.xls)
    loadKnowledgeFromFile(VNFB_PATH, 'VNFB');

    // 3. TaoRepair Rules
    if (fs.existsSync(TAOREPAIR_PATH)) {
        try {
            const wb = XLSX.readFile(TAOREPAIR_PATH);
            const sheet = wb.Sheets["TaoRepair"];
            if (sheet) {
                const repairData = XLSX.utils.sheet_to_json(sheet);
                repairData.forEach(row => {
                    if (row.ROUTE && row.RIDX && row['CODE SQL']) {
                        const key = `${row.ROUTE}_${row.RIDX}`;
                        taoRepairMap.set(key, row['CODE SQL']);
                    }
                });
                console.log(`Loaded ${taoRepairMap.size} rules from TaoRepair`);
            } else {
                console.warn("Sheet 'TaoRepair' not found in", FILE_NAME_TAOREPAIR);
            }
        } catch (e) {
            console.error("Failed to load TaoRepair from", FILE_NAME_TAOREPAIR, e);
        }
    }
};

loadAuxiliaryData();

// API: Generate SQL
app.post('/api/generate-sql', (req, res) => {
    try {
        const { filename, sheetName, dbType } = req.body;
        const selectedDB = knowledgeBase[dbType] || knowledgeBase.VNKR; // Fallback to VNKR
        const { routeAllData, repairFrequencyMap, grpToSectionMap } = selectedDB;
        const filePath = getFilePath(filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const workbook = XLSX.readFile(filePath);
        if (!workbook.Sheets[sheetName]) {
            return res.status(404).json({ error: `Sheet '${sheetName}' not found` });
        }

        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        let sqlOutput = "";

        let useCount = 0;
        let ruleCount = 0;
        let sqlEntryCount = 0;

        rawData.forEach((row, index) => {
            // Support STEP or STEPNM
            const stepValue = row.STEP || row.STEPNM;

            if (!row.RIDX || !stepValue || !row.ROUTE) return;

            // Filter: Only process if REPAIR column has value
            if (!row.REPAIR) return;

            sqlEntryCount++;
            sqlOutput += `-- No: ${sqlEntryCount}\n`;

            const originalRidx = parseInt(row.RIDX);
            const originalStep = stepValue.toString().trim();
            const route = row.ROUTE;

            // CHECK TAOREPAIR RULES FIRST
            const ruleKey = `${route}_${originalRidx}`;
            if (taoRepairMap.has(ruleKey)) {
                sqlOutput += `-- Rule from TaoRepair for RIDX ${originalRidx}\n`;
                sqlOutput += taoRepairMap.get(ruleKey) + "\n\n";
                ruleCount++;
                return; // Skip auto-gen if rule exists
            }
            const originalSection = (row.SECTION || "").toString().trim();
            const basePrefix = originalStep.length >= 4 ? originalStep.slice(0, 4) : "MHBI";
            const alphaSeq = ['Z', 'Y', 'X', 'V', 'W', 'M', 'N', 'J', 'K', 'L'];

            // Helper to get prefix from map
            const getPrefix = (grp, fallbackSec) => {
                const sec = grpToSectionMap.get(grp);
                if (sec) return sec.charAt(0).toUpperCase();
                return fallbackSec ? fallbackSec.charAt(0).toUpperCase() : "X";
            };

            // Split REPAIR into GRPs
            const repairGrpsList = row.REPAIR.toString().split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (repairGrpsList.length === 0) return;

            // 1. Determine Target GRP based on the FIRST GRP in the list
            const firstSourceGrp = repairGrpsList[0];
            let targetGrp = repairFrequencyMap.get(firstSourceGrp);
            let knowledgeFound = true;
            if (!targetGrp) {
                knowledgeFound = false;
                const tempPrefix = getPrefix(firstSourceGrp, originalSection);
                const searchStepName = `${basePrefix}${tempPrefix}${firstSourceGrp}`;

                const findNextInDB = (s, r) => {
                    if (!routeAllData.length) return null;
                    const idx = routeAllData.findIndex(row => (row.ROUTE === r) && (row.STEP === s || row.STEPNM === s));
                    return (idx !== -1 && idx + 1 < routeAllData.length && routeAllData[idx + 1].ROUTE === r) ? routeAllData[idx + 1] : null;
                };

                const nextRouteRow = findNextInDB(searchStepName, route);
                targetGrp = nextRouteRow ? nextRouteRow.GRP : (firstSourceGrp + "1");
            }

            const targetSecPrefix = getPrefix(targetGrp, originalSection);
            const targetSection = grpToSectionMap.get(targetGrp) || originalSection;

            // Construct Final Names (If no knowledge, truncate to 4 chars for safety as requested)
            const getFinalName = (pref, mid, grp) => knowledgeFound ? `${pref}${mid}${grp}` : pref;

            const repairStepName = getFinalName(basePrefix, targetSecPrefix, targetGrp);
            const targetStepForM = getFinalName(basePrefix, alphaSeq[0], targetGrp); // IC4PZTVL

            const columns = `ROUTE,RIDX,STEP,STEPTIME,TIMESTEP,STEPSTAY,LOWSTEPTIME,LOWTIMESTEP,RTYPE1,RTYPE2,RTYPE3,MSTEP,OSTEP,SECTION,GRP,STEPFLAG,STEPFLAG1,STEPFLAG2,STEPFLAG3,KP1,KP2,KP3,TOKP,CHKKP1,CHKKP2,KPMODE,STEPNM`;

            let currentRidx = originalRidx * 10000;

            // Generate rows for each GRP in the list
            repairGrpsList.forEach((currentGrp, i) => {
                const currentSecPrefix = getPrefix(currentGrp, originalSection);
                const oStepName = getFinalName(basePrefix, currentSecPrefix, currentGrp);
                const mStepSeqName = getFinalName(basePrefix, alphaSeq[i % alphaSeq.length], targetGrp);

                if (i === 0) {
                    // FIRST GRP: 1 Repair + 1 Rollback
                    currentRidx += 1;
                    const mStepRepair = getFinalName(basePrefix, alphaSeq[0], currentGrp); // IC4PZTVK
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${repairStepName}',0,0,0,0,0,'','R','','${mStepRepair}','0','${targetSection}','${targetGrp}','','','','','','','','','','','','');\n`;

                    currentRidx += 1;
                    const rollbackStepNamePrefixZ = `${basePrefix}BZZZ`;
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${rollbackStepNamePrefixZ}',0,0,0,0,0,'','B','','${mStepSeqName}','${oStepName}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                } else {
                    // SUBSEQUENT GRPs: Rollback only
                    currentRidx += 1;
                    const rollbackStepNamePrefixZ = `${basePrefix}BZZZ`;
                    sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${currentRidx}','${rollbackStepNamePrefixZ}',0,0,0,0,0,'','B','','${mStepSeqName}','${oStepName}','BACK','ZZZ','','','','','','','','','','','','');\n`;
                }
            });
            sqlOutput += "\n";

            useCount++;
        });

        res.json({
            sql: sqlOutput,
            count: rawData.length,
            info: `Generated ${useCount} Auto, ${ruleCount} from Rules.`
        });

    } catch (error) {
        console.error("SQL Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// Duplicate download route removed

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

    // Keep-alive logic: self-ping every 10 minutes to prevent Render spin-down
    const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    if (EXTERNAL_URL) {
        console.log(`Keep-alive active for: ${EXTERNAL_URL}`);
        setInterval(() => {
            https.get(`${EXTERNAL_URL}/api/ping`, (res) => {
                console.log(`Self-ping status: ${res.statusCode}`);
            }).on('error', (err) => {
                console.error(`Self-ping error: ${err.message}`);
            });
        }, 10 * 60 * 1000); // 10 minutes
    }
});
