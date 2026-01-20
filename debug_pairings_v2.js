const XLSX = require('xlsx');
const fs = require('fs');

function analyzeRepairPairings(file) {
    console.log(`\n--- Analyzing ${file} ---`);
    if (!fs.existsSync(file)) return;
    const wb = XLSX.readFile(file);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const repairRows = data.filter(r => r.RTYPE2 === 'R');
    const pairings = {};

    repairRows.forEach(r => {
        const sourceGrp = r.GRP ? r.GRP.toString().trim() : null;
        const targetStep = r.STEP ? r.STEP.toString().trim() : null;
        if (sourceGrp && targetStep) {
            // Extract target GRP from STEP suffix (last 3 or 4 chars if alphabet starts)
            // But let's just store the full GRP pairing for now
            const targetGrp = targetStep.length >= 3 ? targetStep.slice(-3) : targetStep;
            if (!pairings[sourceGrp]) pairings[sourceGrp] = {};
            pairings[sourceGrp][targetGrp] = (pairings[sourceGrp][targetGrp] || 0) + 1;
        }
    });

    ['TBE', 'TVK', 'TVI', 'TBA'].forEach(grp => {
        console.log(`Most frequent targets for ${grp}:`, pairings[grp] || "Not found");
    });
}

analyzeRepairPairings('ROUTE_ALL.xls');
analyzeRepairPairings('VNFB.xls');
