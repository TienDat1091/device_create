const XLSX = require('xlsx');
const fs = require('fs');

function analyzeKnowledge(filePath, dbKey) {
    if (!fs.existsSync(filePath)) return;
    console.log(`\n--- Analyzing ${dbKey} (${filePath}) ---`);

    const wb = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const pairCounts = {};
    data.forEach(r => {
        if (r.RTYPE2 === 'B' && r.MSTEP && r.OSTEP && r.MSTEP !== '0' && r.OSTEP !== '0') {
            const mStepStr = r.MSTEP.toString().trim();
            const oStepStr = r.OSTEP.toString().trim();
            const sourceGrp = oStepStr.length >= 3 ? oStepStr.slice(-3) : oStepStr;
            const targetGrp = mStepStr.length >= 3 ? mStepStr.slice(-3) : mStepStr;

            if (sourceGrp && targetGrp && sourceGrp !== 'ZZZ' && targetGrp !== 'ZZZ') {
                if (!pairCounts[sourceGrp]) pairCounts[sourceGrp] = {};
                pairCounts[sourceGrp][targetGrp] = (pairCounts[sourceGrp][targetGrp] || 0) + 1;
            }
        }
    });

    // Show TBE specifically
    if (pairCounts['TBE']) {
        console.log('TBE mappings found:', pairCounts['TBE']);
        const targets = pairCounts['TBE'];
        const mostFrequent = Object.keys(targets).reduce((a, b) => targets[a] > targets[b] ? a : b);
        console.log(`Most frequent target for TBE: ${mostFrequent} (${targets[mostFrequent]} times)`);
    } else {
        console.log('No TBE mappings found in Rollback data.');
    }
}

analyzeKnowledge('ROUTE_ALL.xls', 'VNKR');
analyzeKnowledge('VNFB.xls', 'VNFB');
