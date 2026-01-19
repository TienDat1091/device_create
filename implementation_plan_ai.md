# Implementation Plan: Google Gemini AI Integration

## Goal
Integrate Google Gemini 3 API to allow users to modify Excel data using natural language prompts (e.g., "Split column A", "Translate to English", "Format dates").

## Architecture
1.  **Backend (`server.js`)**:
    *   Install `@google/generative-ai` and `dotenv`.
    *   Add `/api/ai/modify` endpoint.
    *   This endpoint receives: `apiKey` (optional, if not env), `data` (JSON rows), `prompt` (User instruction).
    *   Constructs a prompt for Gemini: "You are a data processing assistant. Here is JSON data. [INSTRUCTION]. Return ONLY the valid JSON of the modified data structure."
    *   Returns the new data to frontend.

2.  **Frontend (`index.html` / `app.js` / `style.css`)**:
    *   **AI Panel**: A new section (initially collapsed or a modal) for AI operations.
    *   **API Key Input**: A field to enter the Gemini API Key (saved in `localStorage` for convenience so user doesn't re-enter).
    *   **Prompt Input**: Textarea for user instructions.
    *   **"Apply AI" Button**: Sends data + prompt to server.
    *   **Preview & Save**: When data returns, show a preview. If user accepts, update the table and allow saving back to file.

## Detailed Steps
1.  **Dependencies**: Stop server, `npm install @google/generative-ai dotenv`.
2.  **Server Update**:
    *   Import GoogleGenerativeAI.
    *   Implement `/api/ai/modify`.
    *   Note: Since Gemini has token limits, we might need to handle large sheets by warning the user or sending only selected rows. For now, we will attempt to send the *visible* data (or first N rows) to keep it simple.
3.  **Frontend Update**:
    *   Add `div.ai-panel` in `index.html`.
    *   Add toggle button in header "✨ AI Modify".
    *   Implement `runAIModification()` in `app.js`.
4.  **Verification**: user enters key, asks to modify data, verifies the table updates.

## User Logic Flow
1. User clicks "AI Assistant".
2. User enters API Key (first time).
3. User types: "Create a new column 'Full Name' by combining 'First' and 'Last'".
4. App sends current table data to Server.
5. Server sends to Gemini.
6. Gemini returns new JSON.
7. App refreshes table with new data (highlighting changes would be cool but complex, let's just show new data).
8. User clicks "Save" (existing logic or new logic needed to write back to disk). *Note: Currently we only read. Writing back is a new feature implied by "sửa đổi". I should add a basic "Save to File" feature too.*

**Refinement on Saving**: The user asked to "modify". Using AI implies changing the view. To make it persistent, I should also implement a **Save** feature. I will add a `/api/save` endpoint to write the current JSON back to the Excel file.
