const form = document.getElementById("profileForm");
const saveStatus = document.getElementById("saveStatus");

async function loadSaved(){
    const{profile, apiKey} = await chrome.storage.local.get(["profile", "apiKey"]);
    if(profile) {
        for (const key of PROFILE_SCHEMA_KEYS){
            const el  =document.getElementById(key);
            if (el&&profile[key]) el.value = profile[key];
        }
    }
    if(apiKey) document.getElementById("apiKey").value = apiKey;
}

form.addEventListener("submit", async(e) =>{
    e.preventDefault();
    const profile = {};
    for(const key of PROFILE_SCHEMA_KEYS){
        profile[key] = document.getElementById(key).value.trim();
    }
    const apiKey = document.getElementById("apiKey").value.trim();
    await chrome.storage.local.set({profile,apiKey});
    saveStatus.classList.add("show");
    setTimeout(() => saveStatus.classList.remove("show"), 2000);

});

loadSaved();