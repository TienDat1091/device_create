const XLSX = require('xlsx');

const headers = ["ROUTE", "RIDX", "STEP", "SECTION", "GRP"];
const data = [
    ["ROUTE_DEMO", 2, "XBSZDD30", "D", "D30"],
    ["ROUTE_DEMO", 5, "TSA_EXAMPLE", "T", "TSA"] // Just another example
];

const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "ROUTE_STEP");

XLSX.writeFile(wb, "dummy_input.xlsx");
console.log("Created dummy_input.xlsx");
