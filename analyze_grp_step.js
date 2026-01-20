const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);

const map = {}; // GRP -> { stepSuffix: count }

wb.SheetNames.forEach(sn => {
    if (sn === 'SFIS需求單') return;
    const d = XLSX.utils.sheet_to_json(wb.Sheets[sn]);
    d.forEach(r => {
        const grp = (r.GRP || "").toString().trim();
        const step = (r.STEP || "").toString().trim();
        if (grp && step) {
            // Extract suffix after prefix (usually 5th char onwards)
            const suffix = step.slice(5);
            if (!map[grp]) map[grp] = {};
            map[grp][suffix] = (map[grp][suffix] || 0) + 1;
        }
    });
});

console.log("--- GRP -> STEP SUFFIX MAPPING ---");
for (const grp in map) {
    const targets = map[grp];
    const sorted = Object.entries(targets).sort((a, b) => b[1] - a[1]);
    console.log(`${grp} -> ${sorted[0][0]}`);
}
