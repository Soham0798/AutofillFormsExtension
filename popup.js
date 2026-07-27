const fillBtn = document.getElementById("fillBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

document.getElementById("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});



async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

fillBtn.addEventListener("click", async () => {
  fillBtn.disabled = true;
  statusEl.textContent = "Scanning form...";

  try {
    const tab = await getActiveTab();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["schema.js", "content.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__autofillForms.run(),
    });

    const outcome = result?.then ? await result : result;
    renderOutcome(outcome);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    fillBtn.disabled = false;
  }
});

function renderOutcome(outcome) {
  if (!outcome) {
    statusEl.textContent = "No response from page.";
    statusEl.className = "error";
    return;
  }
  if (!outcome.ok) {
    if (outcome.reason === "EMPTY_PROFILE") {
      statusEl.textContent = "Your profile is empty. Fill it in first.";
      statusEl.className = "warn";
    } else if (outcome.reason === "NO_FIELDS_FOUND") {
      statusEl.textContent = "No fillable fields found on this page.";
      statusEl.className = "warn";
    }
    return;
  }

  statusEl.textContent =
    `Filled ${outcome.filledCount} of ${outcome.attemptedCount} matched fields. ` +
    `${outcome.unmatchedFieldCount} field(s) need review.`;
  statusEl.className = "success";

  if (outcome.filledCount > 0) clearBtn.style.display = "block";
}

clearBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.__autofillForms?.clearAllFills(),
  });
  statusEl.textContent = "Cleared fills.";
  clearBtn.style.display = "none";
});