const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);

const stats = {}; // sourceGrp -> { nextGrp: count }

wb.SheetNames.forEach(sn => {
    if (sn === 'SFIS需求單') return;
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach((row, i) => {
        const currentGrp = (row.GRP || "").toString().trim();
        const nextRow = data[i + 1];
        if (currentGrp && nextRow) {
            const nextGrp = (nextRow.GRP || "").toString().trim();
            if (nextGrp) {
                if (!stats[currentGrp]) stats[currentGrp] = {};
                stats[currentGrp][nextGrp] = (stats[currentGrp][nextGrp] || 0) + 1;
            }
        }
    });
});

console.log("--- FREQUENCY OF NEXT GRP ---");
for (const src in stats) {
    const targets = stats[src];
    const sorted = Object.entries(targets).sort((a, b) => b[1] - a[1]);
    console.log(`${src} -> ${sorted[0][0]} (${sorted[0][1]} times)`);
}
