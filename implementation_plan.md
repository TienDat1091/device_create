# Enhancement Plan: File Management System

## Goal
Add functionality to manage multiple Excel files:
1.  **Upload**: Allow users to upload new Excel files.
2.  **List**: Show all uploaded Excel files in the sidebar or a designated area.
3.  **Delete**: Allow users to delete files (which removes data).
4.  **View**: Switch between different files to view their contents.
5.  **Auto-Import/Refresh**: "if added, data will import after a while" -> We can implement immediate loading upon upload for simplicity and better UX, or a polling mechanism if files are dropped manually. I will assume standard upload via UI for now.

## Backend Changes (`server.js`)
- [NEW] Install `multer` for handling file uploads.
- [MOD] Create an `uploads` directory to store files.
- [MOD] API `GET /api/files`: List all Excel files in the uploads folder.
- [MOD] API `POST /api/upload`: Handle file upload.
- [MOD] API `DELETE /api/files/:filename`: Delete a file.
- [MOD] Update `GET /api/sheets` and `GET /api/data/:sheetName` to accept a `filename` query parameter (e.g., `?file=MyData.xlsx`).

## Frontend Changes
- [MOD] `index.html`:
    - Add a "File Manager" section in the sidebar.
    - Add an "Upload" button/input.
    - Add a list of files with "Delete" buttons.
- [MOD] `app.js`:
    - Fetch list of files on init.
    - Handle file selection (load sheets for that specific file).
    - Handle file upload interaction.
    - Handle file deletion interaction.
- [MOD] `style.css`:
    - Style the file list, upload button, and active file state.

## Verification
- Upload a new excel file.
- Verify it appears in the list.
- Click to view its sheets and data.
- Delete it and verify it's gone and data is cleared.
