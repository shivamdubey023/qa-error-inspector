const container = document.getElementById("errors");
const clearBtn =
  document.getElementById("clearErrors") ||
  document.getElementById("clear");

// Clear all errors
if (clearBtn && container) {
  clearBtn.addEventListener("click", () => {
    container.innerHTML = "";
  });
}

// Listen to network requests
chrome.devtools.network.onRequestFinished.addListener((request) => {

  const status = request?.response?.status;
  const url = request?.request?.url || "(unknown)";
  const method = request?.request?.method || "";

  request.getContent((body) => {

    // Normalize empty body
    if (!body) {
      body = "No response body available";
    }

    const hasNoBody =
      body.includes("No response body available") ||
      body.includes("failed before response");

    // Detect GraphQL errors
    let graphQLError = null;
    try {
      const json = typeof body === "string" ? JSON.parse(body) : body;
      if (json?.errors?.length) {
        graphQLError = JSON.stringify(json.errors, null, 2);
      }
    } catch (e) {
      if (String(body).includes('"errors"')) {
        graphQLError = body;
      }
    }

    // FINAL SIMPLE RULE
    const shouldShow =
      graphQLError ||
      hasNoBody ||
      (typeof status === "number" && status !== 200);

    if (!shouldShow || !container) return;

    // Create error card
    const div = document.createElement("div");
    div.className = "error";

    const time = new Date().toLocaleTimeString();

    div.innerHTML = `
      <div class="timestamp">🕒 ${time}</div>
      <div><b>URL:</b> ${url}</div>
      <div><b>Method:</b> ${method}</div>
      <div><b>Status:</b> ${status}</div>
      <pre>${graphQLError || body}</pre>
    `;

    container.prepend(div);
  });
});
