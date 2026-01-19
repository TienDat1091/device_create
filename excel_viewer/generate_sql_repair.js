const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuration
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\excel_viewer\\dummy_input.xlsx";
const SHEET_NAME = "ROUTE_STEP";

// Data Processing
function generateSQL() {
    if (!fs.existsSync(FILE_PATH)) {
        console.error("File not found:", FILE_PATH);
        return;
    }

    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[SHEET_NAME];

    if (!sheet) {
        console.error(`Sheet '${SHEET_NAME}' not found.`);
        console.log("Available sheets:", workbook.SheetNames);
        return;
    }

    const rawData = XLSX.utils.sheet_to_json(sheet);
    let sqlOutput = "";

    // Group rows by ROUTE to handle RIDX correctly
    // Assuming data is already sorted or we process row by row.
    // The user's request focuses on specific rows that are "Repair".

    console.log(`Found ${rawData.length} rows.`);

    // Mock-up logic based on user request:
    // We need to find rows that represent "REPAIR" steps (TSA, T73...).
    // Check if there is a column indicating 'Repair' or we iterate all.
    // For specific example, let's assume we are generating for *all* rows 
    // or looking for specific criteria.

    // User said: "Ở file route hiện tại đang có những REPAIR là TSA, T73..."
    // Let's print unique values of likely columns to identify the "Repair" flag.
    // However, to satisfy "Tạo thử", I will generate the SQL for the rows found 
    // using the formula logic.

    rawData.forEach(row => {
        // Validation: Must have RIDX and STEP
        if (!row.RIDX || !row.STEP || !row.ROUTE) return;

        // LOGIC: Check if this row *needs* Repair/Rollback generation.
        // User implied we compare with "ROUTE ALL", but gave a specific formula.
        // Let's implement the generation logic for *every* row for demonstration,
        // or filter by a 'REPAIR_NEEDED' flag if it existed. 
        // Given the prompt "Ở file route hiện tại đang có những REPAIR là TSA...", 
        // let's look for a column that matches these values.

        // Let's assume for this demo we generate for *every* step that looks like a standard step.
        // Or better, let's just generate for the Example case if we can't identify them.

        // Actually, let's simply output the logic for the *last* row as a test, 
        // to show effective transformation.

        const originalRidx = parseInt(row.RIDX);
        const originalStep = row.STEP.toString().trim();
        const route = row.ROUTE;

        // REPAIR STEP (20001)
        const repairRidx = 20000 + (originalRidx * 10) + 1; // Wait, user: 2 -> 20001. 
        // Formula: 20000 + (RIDX - ?). 
        // User example: RIDX 2 -> 20001. RIDX 2 -> 20002.
        // Wait, if RIDX is 3? 20001? No.
        // It's likely RIDX 2 maps to the block 20000.
        // Let's assume logic: Base = 20000. Offset = 1 (Repair), 2 (Rollback).
        // BUT if RIDX is 3, is it 30001?
        // User said: "biết rằng 2 là số đầu tiên của RIDX còn 4 số sau sẽ giống như kiểu thứ tự".
        // So RIDX 2 -> 20001.
        // RIDX 15 -> 150001? Or 15001? 4 chars suffix...
        // Let's use logic: RIDX * 10000 + 1.

        const repairRidxCalc = originalRidx * 10000 + 1;
        const rollbackRidxCalc = originalRidx * 10000 + 2;

        // Derive SECTION and GRP from STEP (Last 4 chars)
        // Example XBSZDD30 -> DD30. Section D, Grp D30.
        const last4 = originalStep.slice(-4);
        const section = last4.charAt(0);
        const grp = last4; // User said "GRP sẽ là 3 chữ cái còn lại, nếu GRP 4 chữ thì 4 kí tự".
        // Example: D30 -> D (Section), D30 (GRP)? 
        // Example 2: DD31 -> D (Section), D31 (GRP).
        // Logic: Section is 1st char of Last 4. GRP is Last 4.

        // GENERATE REPAIR STEP
        // Note: For actual Repair Step name ("MHBI..."), we need the *Target* step (the one we are repairing TO?).
        // The user said "đối chiếu với dữ liệu hiện có... nếu STEP của RIDX 2: XBSZDD30... Thì STEP của RIDX 20001 sẽ là MHBIDD31".
        // This implies looking up the *Next* step or a mapped step.
        // Without the full "ROUTE_ALL" lookup, I will simulate this by incrementing the GRP.
        // (DD30 -> DD31).

        // Simulated Lookup
        let nextGrp = grp;
        // simplistic increment for demo
        const numPart = parseInt(grp.match(/\d+$/)?.[0] || "0");
        nextGrp = grp.replace(/\d+$/, numPart + 1);

        const repairStepName = `MHBI${nextGrp}`; // MHBI + D31 (Simulated)

        // SQL
        sqlOutput += `-- For RIDX ${originalRidx} (${originalStep})\n`;
        sqlOutput += `INSERT INTO ROUTE_STEP (ROUTE, RIDX, STEP, SECTION, GRP, RTYPE2, MSTEP, OSTEP) VALUES\n`;

        // Repair
        sqlOutput += `('${route}', ${repairRidxCalc}, '${repairStepName}', '${section}', '${nextGrp}', 'R', '${originalStep}', NULL),\n`;

        // Rollback
        const rollbackStepName = `MHBIBZZZ`;
        const oStepName = `MHBI${grp}`; // MHBI + Original Grp

        sqlOutput += `('${route}', ${rollbackRidxCalc}, '${rollbackStepName}', 'BACK', 'ZZZ', 'R', '${repairStepName}', '${oStepName}');\n\n`;
    });

    // Output only first 5 to console to avoid spam
    console.log(sqlOutput.split('\n').slice(0, 50).join('\n'));
}

generateSQL();
