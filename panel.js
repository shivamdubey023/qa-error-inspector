/**
 * Panel script for QA Error Inspector DevTools panel.
 * Listens to finished network requests and displays HTTP / GraphQL errors.
 */

// Container element where errors will be rendered. If missing, log a warning
const container = document.getElementById('errors');
if (!container) {
  console.warn('QA Error Inspector: container with id "errors" not found in panel.html');
}

// Attach listener for finished network requests in DevTools
chrome.devtools.network.onRequestFinished.addListener((request) => {
  try {
    // Defensive access: response/status or request/url may be undefined for some resources
    const status = request?.response?.status;
    const url = request?.request?.url;
    const method = request?.request?.method || '';

    // Read response body (may be empty or non-JSON)
    request.getContent((body) => {
      try {
        let graphQLError = null;

        // Attempt to parse JSON body and detect GraphQL `errors` field
        if (body) {
          try {
            const json = JSON.parse(body);
            if (json && json.errors) {
              graphQLError = JSON.stringify(json.errors, null, 2);
            }
          } catch (e) {
            // Not JSON — ignore JSON parsing errors
          }
        }

        // Show only when HTTP status is an error or GraphQL returned logical errors
        if ((typeof status === 'number' && status >= 400) || graphQLError) {
          // Build error block using DOM APIs to avoid HTML injection issues
          const div = document.createElement('div');
          div.className = 'error';

          const makeRow = (label, value) => {
            const row = document.createElement('div');
            const strong = document.createElement('b');
            strong.textContent = label;
            row.appendChild(strong);
            row.appendChild(document.createTextNode(' ' + (value ?? '')));
            return row;
          };

          div.appendChild(makeRow('URL:', url));
          div.appendChild(makeRow('Method:', method));
          div.appendChild(makeRow('Status:', status));

          const makeDetails = (summaryText, contentStr) => {
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = summaryText;
            const pre = document.createElement('pre');
            pre.textContent = contentStr ?? '';
            details.appendChild(summary);
            details.appendChild(pre);
            return details;
          };

          // Request payload: try to pretty-print JSON when possible
          const rawPost = request?.request?.postData;
          let postDataStr = '(empty)';
          if (rawPost) {
            if (typeof rawPost === 'string') {
              try {
                const parsed = JSON.parse(rawPost);
                postDataStr = JSON.stringify(parsed, null, 2);
              } catch (e) {
                postDataStr = rawPost;
              }
            } else {
              try {
                postDataStr = JSON.stringify(rawPost, null, 2);
              } catch (e) {
                postDataStr = String(rawPost);
              }
            }
          }

          div.appendChild(makeDetails('Request Payload', postDataStr));

          const responseContent = graphQLError || (body ?? '(no response body)');
          div.appendChild(makeDetails('Response / Error', responseContent));

          // Prepend to container (latest first) if container is available
          if (container) container.prepend(div);
        }
      } catch (innerErr) {
        // Catch any unexpected errors while processing the response body
        console.error('QA Error Inspector — processing error:', innerErr);
      }
    });
  } catch (err) {
    console.error('QA Error Inspector — onRequestFinished handler error:', err);
  }
});
