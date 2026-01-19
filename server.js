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
const FILE_NAME_TAOREPAIR = 'Ho tro tao all - Copy - Copy.xlsx';
const TAOREPAIR_PATH = path.join(__dirname, FILE_NAME_TAOREPAIR);

let routeAllData = [];
let taoRepairMap = new Map(); // Key: ROUTE_RIDX, Value: SQL
let repairFrequencyMap = new Map(); // Key: sourceGRP, Value: targetGRP (most frequent)
let grpToSectionMap = new Map(); // Key: GRP, Value: SECTION

// Load Auxiliary Data (ROUTE_ALL & TaoRepair)
const loadAuxiliaryData = () => {
    // 1. ROUTE_ALL & Frequency Analysis
    if (fs.existsSync(ROUTE_ALL_PATH)) {
        try {
            const wb = XLSX.readFile(ROUTE_ALL_PATH);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            routeAllData = XLSX.utils.sheet_to_json(sheet);
            console.log(`Loaded ${routeAllData.length} rows from ROUTE_ALL.xls`);

            // Frequency Analysis for Repair Pairs
            const pairCounts = {}; // Key: SourceGRP, Value: { [targetGRP]: count }
            routeAllData.forEach(r => {
                if (r.GRP && r.SECTION) {
                    grpToSectionMap.set(r.GRP.toString().trim(), r.SECTION.toString().trim());
                }

                if (r.RTYPE2 === 'R' && r.MSTEP && r.MSTEP !== '0') {
                    const mStepStr = r.MSTEP.toString().trim();
                    // Extract GRP from MSTEP (Usually MHBI-Prefix-GRP)
                    // MHBITTSA -> slice(5) -> TSA
                    // MHBIWWINH -> slice(5) -> WINH
                    const sourceGrp = mStepStr.length > 5 ? mStepStr.slice(5) : mStepStr;
                    const targetGrp = r.GRP ? r.GRP.toString().trim() : null;

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
                repairFrequencyMap.set(src, mostFrequent);
            }
            console.log(`Knowledge Base: ${repairFrequencyMap.size} GRP pairings learned.`);

        } catch (e) {
            console.error("Failed to load ROUTE_ALL.xls", e);
        }
    } else {
        console.warn("ROUTE_ALL.xls not found at", ROUTE_ALL_PATH);
    }

    // 2. TaoRepair Rules
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
        const { filename, sheetName } = req.body;
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

        // Helper: Find Next Row in ROUTE_ALL
        const findNextRouteAllVlaues = (currentStep, currentRoute) => {
            if (!routeAllData.length) return null;

            // Assume ROUTE_ALL is sorted. Find index of current step.
            // Matching logic: Must match ROUTE and STEP/STEPNM
            const idx = routeAllData.findIndex(r =>
                (r.ROUTE === currentRoute) &&
                ((r.STEP === currentStep) || (r.STEPNM === currentStep))
            );

            if (idx !== -1 && idx + 1 < routeAllData.length) {
                const nextRow = routeAllData[idx + 1];
                // Verify next row is still same route (optional but good safety)
                if (nextRow.ROUTE === currentRoute) {
                    return nextRow;
                }
            }
            return null;
        };

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

            // Helper to get prefix from map
            const getPrefix = (grp, fallbackSec) => {
                const sec = grpToSectionMap.get(grp);
                if (sec) return sec.charAt(0).toUpperCase();
                return fallbackSec ? fallbackSec.charAt(0).toUpperCase() : "X";
            };

            // Use REPAIR column as identifying GRP (e.g. TSA)
            const originalGrpSpec = (row.REPAIR || row.GRP || "").toString().trim();

            const repairRidxCalc = originalRidx * 10000 + 1;
            const rollbackRidxCalc = originalRidx * 10000 + 2;

            // 1. Determine Target GRP statistically using originalGrpSpec as key
            let targetGrp = repairFrequencyMap.get(originalGrpSpec);
            if (!targetGrp) {
                // Fallback: lookup in ROUTE_ALL using the formed Step name
                const tempPrefix = getPrefix(originalGrpSpec, originalSection);
                const searchStepName = `MHBI${tempPrefix}${originalGrpSpec}`;
                const nextRouteRow = findNextRouteAllVlaues(searchStepName, route);
                targetGrp = nextRouteRow ? nextRouteRow.GRP : (originalGrpSpec + "1");
            }

            const srcPrefix = getPrefix(originalGrpSpec, originalSection);
            const targetPrefix = getPrefix(targetGrp, originalSection);
            const targetSection = grpToSectionMap.get(targetGrp) || originalSection;

            const originalStepNameFormed = `MHBI${srcPrefix}${originalGrpSpec}`;
            const repairStepName = `MHBI${targetPrefix}${targetGrp}`;
            const rollbackStepName = `MHBIZ${targetGrp}`;

            const oStepRollback = originalStepNameFormed;
            const mStepRollback = repairStepName;

            // SQL Template Construction
            const columns = `ROUTE,RIDX,STEP,STEPTIME,TIMESTEP,STEPSTAY,LOWSTEPTIME,LOWTIMESTEP,RTYPE1,RTYPE2,RTYPE3,MSTEP,OSTEP,SECTION,GRP,STEPFLAG,STEPFLAG1,STEPFLAG2,STEPFLAG3,KP1,KP2,KP3,TOKP,CHKKP1,CHKKP2,KPMODE,STEPNM`;

            // Repair Values
            // SECTION = targetSection (e.g. TEST for TSB)
            // RTYPE3 = '', MSTEP = originalStepNameFormed
            sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${repairRidxCalc}','${repairStepName}',0,0,0,0,0,'','R','','${originalStepNameFormed}','0','${targetSection}','${targetGrp}','','','','','','','','','','','','');\n`;

            // Rollback Values
            sqlOutput += `INSERT INTO route_step (${columns}) values('${route}','${rollbackRidxCalc}','${rollbackStepName}',0,0,0,0,0,'','B','','${mStepRollback}','${oStepRollback}','BACK','ZZZ','','','','','','','','','','','','');\n\n`;

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
