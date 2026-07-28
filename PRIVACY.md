# Privacy Policy — AutoFill Forms

**Last updated:** July 2026

AutoFill Forms is a browser extension that fills web forms using information you save locally. This page explains what data the extension handles, where it goes, and what it never does.

## What we store

When you fill in your profile on the extension's Options page, the following is saved **locally in your browser**, using the standard `chrome.storage.local` / `browser.storage.local` API:

- The profile fields you choose to fill in (first name, last name, email, phone, date of birth, street address, city, state, ZIP, country, employer, job title) — any field left blank is simply not stored
- Your Gemini API key, if you choose to provide one
- A small cache of previous field-matching decisions, per website domain, used only to avoid repeat API calls on sites you've filled before

This data is stored only on your own device, in your own browser profile. **We do not operate any server, and we do not receive, see, or have access to any of this data.** It is not synced to any account, cloud service, or third party by this extension.

## What gets sent to Google's Gemini API (only if you provide an API key)

If you choose to add a Gemini API key, the extension may send a request directly from your browser to Google's Gemini API when the local matching logic can't confidently identify a form field. That request includes only:

- The field's label text, `name`/`id` attributes, placeholder text, and input type

It does **not** include any of your actual profile values (your real name, email, phone number, etc.) — only metadata describing the *shape* of the form field itself, so the model can suggest which profile key it likely corresponds to.

This request goes directly from your browser to Google's Gemini API using the key you provided. We do not see, log, or store this request or its response anywhere. Google's own privacy policy governs how they handle this request; see [Google's Privacy Policy](https://policies.google.com/privacy) for details.

If you don't provide an API key, this fallback simply never activates, and no data is ever sent anywhere.

## What gets filled on the page

When you click "Fill this form," the extension writes your saved profile values directly into the form fields on the current page, exactly as if you had typed them yourself. This happens entirely within your browser. **The extension never submits a form on your behalf** — you always review and submit manually.

## What we don't do

- We don't collect, log, sell, or transmit your personal data to ourselves or any third party (other than the direct-to-Gemini request described above, and only with your explicit API key)
- We don't use tracking, analytics, or advertising of any kind
- We don't sync your data across devices or accounts
- We don't access your browsing history, other tabs, or any site you haven't explicitly clicked "Fill this form" on

## Permissions

The extension requests broad host permissions (`<all_urls>`) so that it can run on whatever page you're currently viewing when you click the fill button. It does not run automatically or persistently on every page — it only activates on your explicit click.

## Changes to this policy

If this policy changes, the updated version will be posted here with a new "Last updated" date.

## Contact

Questions about this policy or the extension's data handling can be directed to: [your contact email]
