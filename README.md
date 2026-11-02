# ETDP Word 365 APA 7 Add-in

This add-in provides:

- Paraphrase selected text and replace it in Word.
- Search online academic sources (Crossref).
- Insert APA 7 in-text citations.
- Insert bibliography.
- Sync discovered sources into the Word reference manager when supported by your Word client.

## Folder

- `D:\word-addin-apa-assistant`

## Quick Start

1. Open PowerShell in this folder.
2. Start the add-in server and trust localhost certificates:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_word_apa_assistant.ps1
```

3. Validate the manifest:

```powershell
npm run validate
```

4. Sideload:

- Desktop Word:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\start_word_apa_assistant.ps1 -SideloadDesktop
  ```
- Word on the web:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\start_word_apa_assistant.ps1 -SideloadWeb
  ```

5. Stop local server:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop_word_apa_assistant.ps1
```

## Persistent Local Install (No Admin Center)

If your tenant does not allow Integrated Apps/Admin Center deployment, use local persistent registration:

```powershell
powershell -ExecutionPolicy Bypass -File .\install_word_apa_assistant_persistent.ps1
```

What this does:

- Registers `manifest.xml` in Office development settings.
- Creates startup persistence to keep the localhost HTTPS server available
  - first choice: Windows logon task (`ETDP-Word-APA-Assistant-Server`)
  - fallback: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Starts the server immediately.

Remove the persistent setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall_word_apa_assistant_persistent.ps1
```

## Taskpane Features

- `Load Selected Text`
- `Paraphrase + Replace`
  - Provider options:
    - ETDP API (`/api/LearnerGuide/paraphrase` - Gemma 4:26B / Local LLM)
    - Google Gemini API key (`gemini-2.5-flash` / `gemini-1.5-flash`)
    - No paraphrase provider (citation & reference manager only)
- `Search Online Sources` (Crossref API)
- `Insert Citation at Cursor`
- `Sync All Sources to Word References`
- `Insert Bibliography`

## APA and Reference Manager Behavior

- In-text citation follows APA 7 conventions.
- Reference list is generated in APA 7 format.
- If Word supports `WordApiDesktop 1.3` bibliography APIs, source XML is pushed into Word's reference manager.
- If your client does not expose those APIs, the add-in falls back to plain APA citation text and a generated `References` section.

## Sideload Troubleshooting

- Ensure `https://localhost:3000/taskpane.html` opens in browser without certificate warnings.
- Keep the local HTTPS server running while sideloading and while Word loads the task pane.
- If Word on the web blocks manual upload, use `npm run sideload:web` and check tenant add-in policy with your M365 admin.
- If manual upload in browser fails, remember this manifest uses `https://localhost:3000`; Word on the web can't reliably use your local machine unless the local server is reachable from that context.
- If desktop sideload fails, close Word, run sideload again, then reopen Word.
