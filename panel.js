const container = document.getElementById("errors");
const seenErrors = new Set();

chrome.devtools.network.onRequestFinished.addListener((request) => {

  const resourceType = request._resourceType;
  if (!["fetch", "xhr"].includes(resourceType)) return;

  const status = request.response.status;
  const url = request.request.url;

  request.getContent((body) => {

    let graphQLError = null;

    try {
      const json = JSON.parse(body);
      if (json.errors) {
        graphQLError = JSON.stringify(json.errors, null, 2);
      }
    } catch (e) {}

    if (status >= 400 || graphQLError) {

      const errorKey = url + status;
      if (seenErrors.has(errorKey)) return;
      seenErrors.add(errorKey);

      const div = document.createElement("div");
      div.className = "error";

      div.innerHTML = `
        <div><b>URL:</b> ${url}</div>
        <div><b>Method:</b> ${request.request.method}</div>
        <div><b>Status:</b> ${status}</div>

        <details>
          <summary>Request Payload</summary>
          <pre>${JSON.stringify(request.request.postData || {}, null, 2)}</pre>
        </details>

        <details>
          <summary>Response / Error</summary>
          <pre>${graphQLError || body}</pre>
        </details>
      `;

      container.prepend(div);
    }
  });
});
