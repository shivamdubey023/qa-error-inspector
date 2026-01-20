const searchInput = document.getElementById("search");

if (searchInput && container) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    const items = container.querySelectorAll(".error");

    items.forEach((item) => {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(value) ? "" : "none";
    });
  });
}

const container = document.getElementById("errors");
const clearBtn =
  document.getElementById("clearErrors") ||
  document.getElementById("clear");

if (clearBtn && container) {
  clearBtn.addEventListener("click", () => {
    container.innerHTML = "";
  });
}

chrome.devtools.network.onRequestFinished.addListener((request) => {
  const status = request?.response?.status;
  const url = request?.request?.url || "(unknown)";
  const method = request?.request?.method || "";

  if (method === "OPTIONS") return;

  
  // -------- PAYLOAD EXTRACTION --------
  let payload = null;

  const postData = request?.request?.postData;

  if (postData?.text) {
    try {
      payload = JSON.stringify(JSON.parse(postData.text), null, 2);
    } catch (e) {
      payload = postData.text; // fallback for non-JSON
    }
  } else if (postData?.params?.length) {
    payload = JSON.stringify(postData.params, null, 2);
  } else {
    payload = "No request payload";
  }

  request.getContent((body) => {
    if (!body) {
      body = "No response body available";
    }

    const hasNoBody =
      body.includes("No response body available") ||
      body.includes("failed before response");

    // -------- GRAPHQL ERROR DETECTION --------
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

    // -------- ERROR IN RESPONSE BODY DETECTION --------
    let hasErrorInBody = false;
    if (body && typeof body === "string") {
      const lowerBody = body.toLowerCase();
      hasErrorInBody = lowerBody.includes('error') || lowerBody.includes('fail') || lowerBody.includes('exception') || lowerBody.includes('invalid');
    }

    // -------- FINAL FILTER --------
    const isHttpError =
      typeof status === "number" && status >= 400;

    const shouldShow =
      graphQLError ||
      hasNoBody ||
      isHttpError ||
      hasErrorInBody;

    if (!shouldShow || !container) return;

    const div = document.createElement("div");
    div.className = "error";

    const time = new Date().toLocaleTimeString();

    div.innerHTML = `
      <div class="timestamp">🕒 ${time}</div>
      <div><b>URL:</b> ${url}</div>
      <div><b>Method:</b> ${method}</div>
      <div><b>Status:</b> ${status}</div>

      <details>
        <summary><b>Request Payload</b></summary>
        <pre>${payload}</pre>
      </details>

      <details open>
        <summary><b>Response / Error</b></summary>
        <pre>${graphQLError || body}</pre>
      </details>
    `;

    container.prepend(div);
  });
});
