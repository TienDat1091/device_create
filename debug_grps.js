const XLSX = require('xlsx');
const path = require('path');

const file = 'ROUTE_ALL.xls';
console.log(`Analyzing ${file}...`);

const wb = XLSX.readFile(file);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const sampleSize = 20;
let counter = 0;

console.log("Samples of R-type rows:");
data.forEach(r => {
    if (r.RTYPE2 === 'R' && counter < sampleSize) {
        console.log(`MSTEP: ${r.MSTEP} | GRP: ${r.GRP} | SECTION: ${r.SECTION} | STEP: ${r.STEP}`);
        counter++;
    }
});

console.log("\nSearching for TVI related repairs:");
data.forEach(r => {
    if (r.RTYPE2 === 'R' && (r.MSTEP && r.MSTEP.includes('TVI'))) {
        console.log(`[FOUND TVI in MSTEP] MSTEP: ${r.MSTEP} | GRP: ${r.GRP} | SECTION: ${r.SECTION}`);
    }
    if (r.RTYPE2 === 'R' && (r.GRP === 'TVI')) {
        console.log(`[FOUND TVI in GRP] MSTEP: ${r.MSTEP} | GRP: ${r.GRP} | SECTION: ${r.SECTION}`);
    }
});
