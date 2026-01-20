const XLSX = require('xlsx');
const fs = require('fs');

function analyzeGrp(file, grp) {
    console.log(`\n--- Analyzing ${file} for GRP: ${grp} ---`);
    if (!fs.existsSync(file)) return;
    const wb = XLSX.readFile(file);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const repairRows = data.filter(r => r.RTYPE2 === 'R' && r.GRP === grp);
    const rollbackRows = data.filter(r => r.RTYPE2 === 'B' && r.OSTEP && r.OSTEP.includes(grp));

    console.log(`Repair rows for ${grp}: ${repairRows.length}`);
    const repairTargets = {};
    repairRows.forEach(r => {
        const target = r.STEP;
        repairTargets[target] = (repairTargets[target] || 0) + 1;
    });
    console.log("Most frequent STEP in Repair rows:", repairTargets);

    console.log(`Rollback rows where OSTEP contains ${grp}: ${rollbackRows.length}`);
    const rollbackMSteps = {};
    rollbackRows.forEach(r => {
        const target = r.MSTEP;
        rollbackMSteps[target] = (rollbackMSteps[target] || 0) + 1;
    });
    console.log("Most frequent MSTEP in Rollback rows:", rollbackMSteps);
}

analyzeGrp('ROUTE_ALL.xls', 'TBE');
analyzeGrp('VNFB.xls', 'TBE');
analyzeGrp('ROUTE_ALL.xls', 'TVK');
