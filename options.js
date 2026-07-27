const form = document.getElementById("profileForm");
const saveStatus = document.getElementById("saveStatus");

async function loadSaved(){
    const{profile} = await chrome.storage.local.get("profile");
    if(!profile) return;
    for (const key of PROFILE_SCHEMA_KEYS){
        const el  =document.getElementById(key);
        if (el&&profile[key]) el.value = profile[key];
    }
}

form.addEventListener("submit", async(e) =>{
    e.preventDefault();
    const profile = {};
    for(const key of PROFILE_SCHEMA_KEYS){
        profile[key] = document.getElementById(key).value.trim();
    }
    await chrome.storage.local.set({profile});
    saveStatus.textContent = "Saved";
    setTimeout(()=>(saveStatus.textContent = ""),2000);
});

loadSaved();