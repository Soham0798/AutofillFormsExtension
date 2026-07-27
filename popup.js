document.getElementById("fillBtn").addEventListener("click", async () => {
    const[tab] = await chrome.tabs.query({active:true, currentWindow: true});
    await chrome.scripting.executeScript({
        target: {tabId : tab.id},
        files: ["schema.js","content.js"],
    });
});