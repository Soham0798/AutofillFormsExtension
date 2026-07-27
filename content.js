(()=>{
    if(window.__autofillFormsRunning) return;
    window.__autofillFormsRunning = true;

    function isVisible(el){
        const style = window.getComputedStyle(el);
        if (style.display=="none" || style.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isEligible(el){
        const tag = el.tagName.toLowerCase();
        if(tag === "input"){
            const type = (el.getAttribute("type") || "text").toLowerCase();
            const excluded = ["hidden","submit","button","reset","image","file", "checkbox", "radio"];
            if(excluded.includes(type)) return false;
            }
            if(el.disabled) return false;
            return isVisible(el);
    }

    function  normalize(str){
        return (str || "")
        .toLowerCase()
        .replace(/[_\-]+/g,"")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g," ")
        .trim();
    }

    function tokenOverlapScore(candidateText, synonymPhrase){
        const candTokens = new Set(normalize(candidateText).split(" ").filter(Boolean));
        const synTokens = normalize(synonymPhrase).split(" ").filter(Boolean);
        if (synTokens.length === 0 || candTokens.size===0) return 0;
        let hits = 0;
        for (const t of synTokens){
            if(candTokens.has(t)) hits++;
        }
        return hits/synTokens.length;
    }

    function scoreFieldForKey(field, key){
        const synonyms = SYNONYMS[key] || [];
        const texts = [field.label, field.name, field.id, field.placeholder].filter(Boolean);
        let best = 0;
        for(const text of texts){
            for(const syn of synonyms){
                const score = tokenOverlapScore(text,syn);
                if(score>best) best = score;
            }
        }
        return best;
    }

    const CONFIDENCE_THRESHOLD = 0.6;

    function matchFields(fields){
        const matched = {};
        const usedIdx = new Set();

        for (const key of PROFILE_SCHEMA_KEYS){
            let bestField = null;
            let bestScore = 0;
            for(const field of fields){
                if(usedIdx.has(field.idx)) continue;
                const score = scoreFieldForKey(field,key);
                if(score>bestScore){
                    bestScore = score;
                    bestField = field;
                }
            }
            if(bestField && bestScore >= CONFIDENCE_THRESHOLD){
                matched[key]=bestField;
                usedIdx.add(bestField.idx);
            }
        }
        return matched;
    }

    function setNativeValue(el, value){
        const proto = el.tagName.toLowerCase() ==="textarea"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
        const descriptor  = Object.getOwnPropertyDescriptor(proto,"value");
        descriptor.set.call(el,value);
    }

    function fillField(el,value){
        setNativeValue(el,value);
        el.dispatchEvent(new Event("input", {bubbles: true}));
        el.dispatchEvent(new Event("change",{bubbles:true}));
        el.style.outline = "2px solid #f5c518"

    }
    
    function getLabelText(el){
        const listItem = el.closest('[role="listitem"]');
        if (listItem) {
        const heading = listItem.querySelector('[role="heading"]');
        if (heading && heading.textContent.trim()) {
            return heading.textContent.trim();
        }
        }
        if(el.labels && el.labels.length > 0 && el.labels[0].textContent.trim()){
            return el.labels[0].textContent.trim();
        }
        const parentLabel = el.closest("label");
        if(parentLabel && parentLabel.textContent.trim()){
            return parentLabel.textContent.replace(el.value || "", "").trim();
        }
        if(el.getAttribute("aria-label")){
            return el.getAttribute("aria-label").trim();
        }

        const labelledBy = el.getAttribute("aria-labbelledby");
        if(labelledBy){
            const texts = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id))
            .filter(Boolean)
            .map((n) => n.textContent.trim())
            .filter(Boolean);
            if(texts.length) return texts.join(" ");
        }
        let node = el.previousSibling;
        let hops = 0;
        while(node && hops < 5){
             if(node.textContent && node.textContent.trim()){
                return node.textContent.trim();
             }
             node = node.previousSibling;
             hops++;
        }
        let parent = el.parentElement;
        hops = 0;
        while(parent && hops<3){
            const prev = parent.previousElementSibling;
            if(prev && prev.textContent.trim() && prev.textContent.trim().length<60){
                return prev.textContent.trim();
            }
            parent = parent.parentElement;
            hops++;
        }
        return "";
    }

    async function llmMatchFields(unmatchedFields, alreadyMatchedKeys) {
  const remainingKeys = PROFILE_SCHEMA_KEYS.filter((k) => !alreadyMatchedKeys.includes(k));
  if (unmatchedFields.length === 0 || remainingKeys.length === 0) return {};

  const payload = {
    domain: window.location.hostname,
    remainingKeys,
    fields: unmatchedFields.map((f) => ({
      idx: f.idx, label: f.label, name: f.name, id: f.id, placeholder: f.placeholder, type: f.type,
    })),
  };

  try {
    const response = await chrome.runtime.sendMessage({ type: "LLM_MATCH_FIELDS", payload });
    if (!response?.ok) {
      console.warn("[AutoFill] LLM fallback unavailable:", response?.error);
      return {};
    }
    const result = {};
    for (const [key, idx] of Object.entries(response.matches || {})) {
      const field = unmatchedFields.find((f) => f.idx === idx);
      if (field) result[key] = field;
    }
    return result;
  } catch (err) {
    console.warn("[AutoFill] LLM fallback error:", err);
    return {};
  }
}

    function detectFields(){
        const candidates = Array.from(document.querySelectorAll("input,select,textarea"));
        const fields = [];
        candidates.forEach((el,idx)=>{
            if(!isEligible(el)) return;
            fields.push({
                idx,
                el,
                tag: el.tagName.toLowerCase(),
                type: el.getAttribute("type") || "text",
                label: getLabelText(el),
                placeholder: el.getAttribute("placeholder") || "",
                name: el.getAttribute("name") || "",
                id: el.id || "",
            });
        });
        return fields;
    }
    async function run() {
  const { profile } = await chrome.storage.local.get("profile");
  if (!profile || Object.values(profile).every((v) => !v)) {
    window.__autofillFormsRunning = false;
    return { ok: false, reason: "EMPTY_PROFILE" };
  }

  const fields = detectFields();
  if (fields.length === 0) {
    window.__autofillFormsRunning = false;
    return { ok: false, reason: "NO_FIELDS_FOUND" };
  }

  const matched = matchFields(fields);
  const unmatched = fields.filter((f) => !Object.values(matched).some((m) => m.idx === f.idx));

  const llmMatches = await llmMatchFields(unmatched, Object.keys(matched));
  Object.assign(matched, llmMatches);

  let filledCount = 0;
  let attemptedCount = 0;

  for (const [key, field] of Object.entries(matched)) {
    const value = profile[key];
    if (!value) continue;
    attemptedCount++;
    fillField(field.el, value);
    filledCount++;
  }

  window.__autofillFormsRunning = false;

  return {
    ok: true,
    totalFieldsOnPage: fields.length,
    matchedCount: Object.keys(matched).length,
    filledCount,
    attemptedCount,
    unmatchedFieldCount: fields.length - Object.keys(matched).length,
  };
}

function clearAllFills() {
  document.querySelectorAll('[style*="outline"]').forEach((el) => {
    el.style.outline = "";
  });
}

window.__autofillForms = { run, clearAllFills };
})();