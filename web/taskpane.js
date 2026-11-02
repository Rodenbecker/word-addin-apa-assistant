"use strict";

const SETTINGS_KEY_SOURCES = "etdpApaAssistantSources";
const STORAGE_KEY_PROVIDER = "etdpApaAssistantProvider";
const STORAGE_KEY_ETDP_URL = "etdpApaAssistantEtdpUrl";
const STORAGE_KEY_GEMINI_MODEL = "etdpApaAssistantGeminiModel";
const STORAGE_KEY_GEMINI_KEY = "etdpApaAssistantGeminiKey";

const state = {
  sources: [],
  selectedSourceIndex: -1
};

let ui = null;

function $(id) {
  return document.getElementById(id);
}

function logStatus(message) {
  const current = ui.status.textContent.trim();
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  ui.status.textContent = current && current !== "Ready."
    ? `${line}\n${current}`
    : line;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeText(value) {
  return String(value || "").trim();
}

function randomGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeTag(value) {
  const cleaned = String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 20);
  return cleaned || "Source";
}

function buildSourceTag(source, suffix = "") {
  const firstAuthor = source.authors?.[0];
  const authorToken = normalizeTag(firstAuthor?.last || firstAuthor?.name || "Source");
  const year = source.year ? String(source.year) : "n.d";
  return `${authorToken}${year}${suffix}`.slice(0, 40);
}

function readDateYear(item) {
  const dateParts = item?.issued?.["date-parts"] || item?.published?.["date-parts"] || item?.["published-print"]?.["date-parts"];
  if (!Array.isArray(dateParts) || !Array.isArray(dateParts[0])) {
    return "";
  }
  const year = dateParts[0][0];
  return year ? String(year) : "";
}

function parseCrossrefAuthors(item) {
  const authors = item?.author;
  if (!Array.isArray(authors)) {
    return [];
  }
  return authors
    .map((author) => ({
      given: safeText(author.given),
      family: safeText(author.family),
      first: safeText(author.given),
      last: safeText(author.family),
      name: safeText(`${author.family || ""} ${author.given || ""}`.trim())
    }))
    .filter((author) => author.name);
}

function toSourceModel(item) {
  const title = Array.isArray(item?.title) ? safeText(item.title[0]) : safeText(item?.title);
  const containerTitle = Array.isArray(item?.["container-title"])
    ? safeText(item["container-title"][0])
    : safeText(item?.["container-title"]);
  const doi = safeText(item?.DOI);
  const url = safeText(item?.URL) || (doi ? `https://doi.org/${doi}` : "");
  const source = {
    id: randomGuid(),
    title,
    year: readDateYear(item),
    authors: parseCrossrefAuthors(item),
    doi,
    url,
    publisher: safeText(item?.publisher),
    containerTitle,
    type: safeText(item?.type),
    tag: ""
  };
  source.tag = buildSourceTag(source);
  return source;
}

function initial(name) {
  const n = safeText(name);
  if (!n) return "";
  return n
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
}

function formatApaAuthor(author) {
  const family = safeText(author?.family || author?.last || "");
  const given = safeText(author?.given || author?.first || "");
  if (!family && !given) return "";
  if (!family) return given;
  const ini = initial(given);
  return ini ? `${family}, ${ini}` : family;
}

function formatApaAuthorList(authors) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return "";
  }
  const formatted = authors
    .map(formatApaAuthor)
    .filter(Boolean);
  if (formatted.length === 0) {
    return "";
  }
  if (formatted.length === 1) {
    return formatted[0];
  }
  if (formatted.length <= 20) {
    return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
  }
  const firstNineteen = formatted.slice(0, 19).join(", ");
  const last = formatted[formatted.length - 1];
  return `${firstNineteen}, ... ${last}`;
}

function formatApaInText(source) {
  const authors = source.authors || [];
  const year = source.year || "n.d.";
  if (authors.length === 0) {
    const shortTitle = source.title ? source.title.split(/\s+/).slice(0, 3).join(" ") : "Source";
    return `(${shortTitle}, ${year})`;
  }
  if (authors.length === 1) {
    return `(${authors[0].last || authors[0].name}, ${year})`;
  }
  if (authors.length === 2) {
    return `(${authors[0].last || authors[0].name} & ${authors[1].last || authors[1].name}, ${year})`;
  }
  return `(${authors[0].last || authors[0].name} et al., ${year})`;
}

function formatApaReference(source) {
  const authorPart = formatApaAuthorList(source.authors) || source.publisher || "Unknown author";
  const yearPart = source.year ? `(${source.year}).` : "(n.d.).";
  const titlePart = source.title ? `${source.title}.` : "";
  const venuePart = source.containerTitle
    ? `${source.containerTitle}.`
    : source.publisher
      ? `${source.publisher}.`
      : "";

  let locator = "";
  if (source.doi) {
    locator = `https://doi.org/${source.doi}`;
  } else if (source.url) {
    locator = source.url;
  }
  return [authorPart, yearPart, titlePart, venuePart, locator]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapSourceType(type) {
  const normalized = safeText(type).toLowerCase();
  if (normalized.includes("journal")) return "JournalArticle";
  if (normalized.includes("book")) return "Book";
  if (normalized.includes("chapter")) return "BookSection";
  if (normalized.includes("proceedings")) return "ConferenceProceedings";
  if (normalized.includes("report")) return "Report";
  return "Misc";
}

function toWordSourceXml(source) {
  const peopleXml = (source.authors || [])
    .map((author) => {
      const first = escapeXml(author.first || author.given || "");
      const last = escapeXml(author.last || author.family || author.name || "");
      if (!first && !last) return "";
      return `<b:Person><b:Last>${last}</b:Last><b:First>${first}</b:First></b:Person>`;
    })
    .filter(Boolean)
    .join("");

  const authorBlock = peopleXml
    ? `<b:Author><b:Author><b:NameList>${peopleXml}</b:NameList></b:Author></b:Author>`
    : "";

  const guid = randomGuid();
  const tag = escapeXml(source.tag || buildSourceTag(source));
  const title = escapeXml(source.title || "");
  const year = escapeXml(source.year || "");
  const journal = escapeXml(source.containerTitle || "");
  const publisher = escapeXml(source.publisher || "");
  const url = escapeXml(source.url || "");
  const doi = escapeXml(source.doi || "");
  const sourceType = mapSourceType(source.type);

  return [
    '<b:Source xmlns:b="http://schemas.openxmlformats.org/officeDocument/2006/bibliography">',
    `<b:Tag>${tag}</b:Tag>`,
    `<b:SourceType>${sourceType}</b:SourceType>`,
    `<b:Guid>{${guid}}</b:Guid>`,
    "<b:LCID>1033</b:LCID>",
    authorBlock,
    title ? `<b:Title>${title}</b:Title>` : "",
    year ? `<b:Year>${year}</b:Year>` : "",
    journal ? `<b:JournalName>${journal}</b:JournalName>` : "",
    publisher ? `<b:Publisher>${publisher}</b:Publisher>` : "",
    doi ? `<b:DOI>${doi}</b:DOI>` : "",
    url ? `<b:URL>${url}</b:URL>` : "",
    "</b:Source>"
  ].join("");
}

function setBusy(isBusy) {
  [
    ui.btnLoadSelection,
    ui.btnParaphrase,
    ui.btnSearchSources,
    ui.btnInsertCitation,
    ui.btnInsertBibliography,
    ui.btnRefreshWordSources
  ].forEach((button) => {
    button.disabled = isBusy;
  });
}

function updateProviderVisibility() {
  const provider = ui.paraphraseProvider.value;
  const etdpField = $("field-etdp-url");
  const geminiModelField = $("field-gemini-model");
  const geminiKeyField = $("field-gemini-key");

  if (etdpField) etdpField.style.display = provider === "etdp" ? "block" : "none";
  if (geminiModelField) geminiModelField.style.display = provider === "gemini" ? "block" : "none";
  if (geminiKeyField) geminiKeyField.style.display = provider === "gemini" ? "block" : "none";
}

function saveUiPreferences() {
  localStorage.setItem(STORAGE_KEY_PROVIDER, ui.paraphraseProvider.value);
  localStorage.setItem(STORAGE_KEY_ETDP_URL, ui.etdpUrl.value.trim());
  localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, ui.geminiModel.value.trim());
  localStorage.setItem(STORAGE_KEY_GEMINI_KEY, ui.geminiKey.value.trim());
  updateProviderVisibility();
}

function loadUiPreferences() {
  const provider = localStorage.getItem(STORAGE_KEY_PROVIDER);
  const etdpUrl = localStorage.getItem(STORAGE_KEY_ETDP_URL);
  const geminiModel = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
  const geminiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);

  if (provider) ui.paraphraseProvider.value = provider;
  if (etdpUrl) ui.etdpUrl.value = etdpUrl;
  if (geminiModel) ui.geminiModel.value = geminiModel;
  if (geminiKey) ui.geminiKey.value = geminiKey;
  updateProviderVisibility();
}

function loadSourcesFromDocumentSettings() {
  const stored = Office.context.document.settings.get(SETTINGS_KEY_SOURCES);
  if (Array.isArray(stored)) {
    state.sources = stored;
  } else {
    state.sources = [];
  }
  state.selectedSourceIndex = state.sources.length > 0 ? 0 : -1;
  renderSources();
}

function saveSourcesToDocumentSettings() {
  Office.context.document.settings.set(SETTINGS_KEY_SOURCES, state.sources);
  return new Promise((resolve, reject) => {
    Office.context.document.settings.saveAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve();
      } else {
        reject(new Error(result.error?.message || "Failed saving Word document settings."));
      }
    });
  });
}

function addOrUpdateSource(source) {
  const key = source.doi || source.url || source.title;
  if (!key) {
    return;
  }
  const index = state.sources.findIndex((existing) => {
    const existingKey = existing.doi || existing.url || existing.title;
    return existingKey === key;
  });

  if (index >= 0) {
    state.sources[index] = { ...state.sources[index], ...source };
    state.selectedSourceIndex = index;
  } else {
    state.sources.push(source);
    state.selectedSourceIndex = state.sources.length - 1;
  }
}

function renderSources() {
  ui.sourceResults.innerHTML = "";
  if (!state.sources.length) {
    ui.sourceResults.innerHTML = "<div class='source-meta'>No sources loaded yet.</div>";
    return;
  }

  state.sources.forEach((source, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "source-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "sourcePick";
    radio.checked = index === state.selectedSourceIndex;
    radio.addEventListener("change", () => {
      state.selectedSourceIndex = index;
      renderSources();
    });

    const title = document.createElement("div");
    title.className = "source-title";
    title.textContent = source.title || "Untitled source";

    const meta = document.createElement("div");
    meta.className = "source-meta";
    meta.textContent = `${source.containerTitle || source.publisher || "Unknown venue"} | ${source.year || "n.d."}`;

    const citation = document.createElement("div");
    citation.className = "source-citation";
    citation.textContent = formatApaReference(source);

    wrapper.appendChild(radio);
    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    wrapper.appendChild(citation);
    ui.sourceResults.appendChild(wrapper);
  });
}

function selectedSource() {
  if (state.selectedSourceIndex < 0 || state.selectedSourceIndex >= state.sources.length) {
    return null;
  }
  return state.sources[state.selectedSourceIndex];
}

async function getSelectedWordText() {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");
    await context.sync();
    return selection.text || "";
  });
}

async function replaceSelectedWordText(newText) {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertText(newText, Word.InsertLocation.replace);
    await context.sync();
  });
}

async function appendTextAtCursor(text) {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertText(text, Word.InsertLocation.end);
    await context.sync();
  });
}

async function insertReferenceSectionFromState() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.insertParagraph("", Word.InsertLocation.end);
    body.insertParagraph("References", Word.InsertLocation.end);
    state.sources.forEach((source) => {
      body.insertParagraph(formatApaReference(source), Word.InsertLocation.end);
    });
    await context.sync();
  });
}

function supportsWordApi(minVersion) {
  return Office.context.requirements.isSetSupported("WordApi", minVersion);
}

function supportsWordApiDesktop(minVersion) {
  return Office.context.requirements.isSetSupported("WordApiDesktop", minVersion);
}

async function addSourceToWordReferenceManager(source) {
  if (!supportsWordApiDesktop("1.3")) {
    throw new Error("WordApiDesktop 1.3 is not supported in this Word client.");
  }

  const xml = toWordSourceXml(source);
  return Word.run(async (context) => {
    const bibliography = context.application.bibliography;
    bibliography.sources.add(xml);
    await context.sync();
  });
}

async function insertCitationField(tag, fallbackCitationText) {
  if (!supportsWordApi("1.5")) {
    throw new Error("WordApi 1.5 fields are not supported in this Word client.");
  }
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    const field = selection.insertField(Word.InsertLocation.end, Word.FieldType.citation, tag, true);
    field.load("code");
    field.result.load("text");
    await context.sync();

    const resultText = safeText(field.result.text);
    const normalized = resultText.toLowerCase();
    const suspiciousResult =
      !resultText ||
      normalized.includes("wrong citation inserted") ||
      normalized.startsWith("error") ||
      resultText === tag;

    if (suspiciousResult) {
      field.delete();
      selection.insertText(` ${fallbackCitationText}`, Word.InsertLocation.end);
      await context.sync();
      return {
        insertedField: false,
        fallbackUsed: true,
        resultText
      };
    }

    return {
      insertedField: true,
      fallbackUsed: false,
      resultText
    };
  });
}

async function insertBibliographyField() {
  if (!supportsWordApi("1.5")) {
    throw new Error("WordApi 1.5 fields are not supported in this Word client.");
  }
  return Word.run(async (context) => {
    const body = context.document.body;
    body.insertParagraph("", Word.InsertLocation.end);
    const range = body.getRange(Word.RangeLocation.end);
    range.insertField(Word.InsertLocation.end, Word.FieldType.bibliography, "", true);
    await context.sync();
  });
}

async function callParaphraseProvider(text) {
  const provider = ui.paraphraseProvider.value;
  if (provider === "none") {
    throw new Error("No paraphrase provider selected.");
  }

  if (provider === "etdp") {
    const baseUrl = ui.etdpUrl.value.trim().replace(/\/$/, "");
    const payload = {
      text,
      style: "academic",
      preserveTerminology: true
    };
    const response = await fetch(`${baseUrl}/api/LearnerGuide/paraphrase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ETDP paraphrase failed (${response.status}): ${detail.slice(0, 240)}`);
    }
    const data = await response.json();
    return safeText(data.paraphrased) || text;
  }

  const key = ui.geminiKey.value.trim();
  if (!key) {
    throw new Error("Google Gemini API key is empty.");
  }
  const model = ui.geminiModel.value.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: "Paraphrase the following text into clear, academic, and outcomes-based educational prose. Preserve all technical terminology, occupational context, and meaning. Return only the paraphrased paragraph without introductory or concluding conversational text:\n\n" + text
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Gemini paraphrase failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  const data = await response.json();
  const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return safeText(output) || text;
}

async function searchCrossrefSources(query) {
  const cleaned = safeText(query).slice(0, 500);
  if (!cleaned) {
    throw new Error("No query text found for source search.");
  }

  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("rows", "12");
  url.searchParams.set("query.bibliographic", cleaned);
  url.searchParams.set("select", "DOI,title,author,issued,published,container-title,publisher,URL,type");

  const response = await fetch(url.toString());
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Crossref query failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  const data = await response.json();
  const items = data?.message?.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map(toSourceModel)
    .filter((source) => source.title);
}

async function handleLoadSelection() {
  setBusy(true);
  try {
    saveUiPreferences();
    const selected = await getSelectedWordText();
    ui.selectionText.value = selected;
    logStatus(selected ? "Loaded selected text from Word." : "Selection is empty.");
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function handleParaphrase() {
  setBusy(true);
  try {
    saveUiPreferences();
    const original = safeText(ui.selectionText.value) || safeText(await getSelectedWordText());
    if (!original) {
      throw new Error("Select or load text first.");
    }
    const paraphrased = await callParaphraseProvider(original);
    ui.selectionText.value = paraphrased;
    await replaceSelectedWordText(paraphrased);
    logStatus("Paraphrased text inserted into the document.");
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function handleSearchSources() {
  setBusy(true);
  try {
    const query = safeText(ui.selectionText.value) || safeText(await getSelectedWordText());
    if (!query) {
      throw new Error("Select text first to search relevant sources.");
    }
    const found = await searchCrossrefSources(query);
    if (!found.length) {
      logStatus("No online sources found for the current selection.");
      return;
    }
    found.forEach(addOrUpdateSource);
    await saveSourcesToDocumentSettings();
    renderSources();
    logStatus(`Loaded ${found.length} sources from Crossref and saved to document settings.`);
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function handleInsertCitation() {
  setBusy(true);
  try {
    const source = selectedSource();
    if (!source) {
      throw new Error("Select a source first.");
    }

    if (!source.tag) {
      source.tag = buildSourceTag(source, randomGuid().slice(0, 4));
    }
    addOrUpdateSource(source);
    await saveSourcesToDocumentSettings();
    renderSources();

    let referenceManagerSynced = false;
    try {
      await addSourceToWordReferenceManager(source);
      referenceManagerSynced = true;
      logStatus(`Added source '${source.tag}' to Word Reference Manager.`);
    } catch (managerError) {
      logStatus(`Reference Manager sync skipped: ${managerError.message}`);
    }

    const plainTextCitation = formatApaInText(source);

    if (referenceManagerSynced && supportsWordApi("1.5")) {
      try {
        const fieldResult = await insertCitationField(source.tag, plainTextCitation);
        if (fieldResult.insertedField) {
          logStatus("Inserted citation field.");
        } else {
          logStatus("Word citation field could not be resolved. Inserted APA in-text citation as plain text.");
        }
        return;
      } catch (fieldError) {
        logStatus(`Citation field insert unavailable: ${fieldError.message}`);
      }
    }

    await appendTextAtCursor(` ${plainTextCitation}`);
    logStatus("Inserted APA in-text citation as plain text.");
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function handleSyncAllSourcesToWord() {
  setBusy(true);
  try {
    if (!state.sources.length) {
      throw new Error("No sources loaded to sync.");
    }
    let okCount = 0;
    for (const source of state.sources) {
      if (!source.tag) {
        source.tag = buildSourceTag(source, randomGuid().slice(0, 4));
      }
      try {
        await addSourceToWordReferenceManager(source);
        okCount += 1;
      } catch {
        // Continue best-effort sync.
      }
    }
    await saveSourcesToDocumentSettings();
    renderSources();
    logStatus(`Word Reference Manager sync complete: ${okCount}/${state.sources.length} sources added.`);
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function handleInsertBibliography() {
  setBusy(true);
  try {
    if (!state.sources.length) {
      throw new Error("No sources available. Search and load sources first.");
    }
    try {
      await insertBibliographyField();
      logStatus("Inserted Word bibliography field.");
      return;
    } catch (fieldError) {
      logStatus(`Bibliography field insert unavailable: ${fieldError.message}`);
    }

    await insertReferenceSectionFromState();
    logStatus("Inserted fallback APA References section.");
  } catch (error) {
    logStatus(error.message);
  } finally {
    setBusy(false);
  }
}

function wireEvents() {
  ui.btnLoadSelection.addEventListener("click", handleLoadSelection);
  ui.btnParaphrase.addEventListener("click", handleParaphrase);
  ui.btnSearchSources.addEventListener("click", handleSearchSources);
  ui.btnInsertCitation.addEventListener("click", handleInsertCitation);
  ui.btnInsertBibliography.addEventListener("click", handleInsertBibliography);
  ui.btnRefreshWordSources.addEventListener("click", handleSyncAllSourcesToWord);

  ui.paraphraseProvider.addEventListener("change", () => {
    saveUiPreferences();
    updateProviderVisibility();
  });
  ui.etdpUrl.addEventListener("change", saveUiPreferences);
  ui.geminiModel.addEventListener("change", saveUiPreferences);
  ui.geminiKey.addEventListener("change", saveUiPreferences);
}

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    return;
  }

  ui = {
    btnLoadSelection: $("btn-load-selection"),
    btnParaphrase: $("btn-paraphrase"),
    btnSearchSources: $("btn-search-sources"),
    btnInsertCitation: $("btn-insert-citation"),
    btnInsertBibliography: $("btn-insert-bibliography"),
    btnRefreshWordSources: $("btn-refresh-word-sources"),
    selectionText: $("selection-text"),
    sourceResults: $("source-results"),
    status: $("status"),
    paraphraseProvider: $("paraphrase-provider"),
    etdpUrl: $("etdp-url"),
    geminiModel: $("gemini-model"),
    geminiKey: $("gemini-key")
  };

  loadUiPreferences();
  loadSourcesFromDocumentSettings();
  wireEvents();

  logStatus("Word add-in initialized.");
  logStatus(`WordApi 1.5 fields: ${supportsWordApi("1.5") ? "available" : "not available"}`);
  logStatus(`WordApiDesktop 1.3 bibliography: ${supportsWordApiDesktop("1.3") ? "available" : "not available"}`);
});
