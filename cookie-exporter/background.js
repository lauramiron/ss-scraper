// @ts-nocheck
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // derive the base domain (last two labels) from the current tab's hostname
    const { hostname } = new URL(tab.url);
    const parts = hostname.split('.');
    const baseDomain =
      parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

    // get all cookies visible to the extension
    const allCookies = await new Promise((res) =>
      chrome.cookies.getAll({}, (cks) => res(cks || []))
    );

    // filter for cookies ending with the base domain (handles subdomains)
    const cookies = allCookies
      .filter(c => (c.domain || '').replace(/^\./, '').endsWith(baseDomain))
      .map(c => {
        // normalize SameSite
        let ss = (c.sameSite || '').toLowerCase();
        if (ss === 'strict') ss = 'Strict';
        else if (ss === 'lax') ss = 'Lax';
        else if (ss === 'none') ss = 'None';
        else ss = 'Lax';
        return { ...c, sameSite: ss };
      });

    // prepare and download JSON in session state format
    const json = JSON.stringify({ cookies }, null, 2);
    const dataUrl =
      'data:application/json;charset=utf-8,' + encodeURIComponent(json);

    chrome.downloads.download({
      url: dataUrl,
      filename: `${baseDomain}-cookies.json`
    });
  } catch (err) {
    console.error('Cookie export error', err);
  }
});
