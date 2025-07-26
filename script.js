document.addEventListener('DOMContentLoaded', () => {
    // The NEMA AlertHub RSS Feed URL
    const nemaFeedUrl = 'https://alerthub.civildefence.govt.nz/rss/pwp';

    // The public CORS proxy URL
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nemaFeedUrl)}`;

    const feedContainer = document.getElementById('nema-alerts-feed');

    feedContainer.innerHTML = '<p>Loading alerts...</p>'; // Show loading message

    fetch(proxyUrl)
        .then(response => {
            if (!response.ok) {
                // If proxy returns an HTTP error (e.g., 500)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // IMPORTANT: allorigins.win returns a JSON object, so parse as JSON first
            return response.json();
        })
        .then(data => {
            // Check if the JSON response contains the 'contents' property
            if (!data.contents) {
                throw new Error('No content received from proxy.');
            }

            let xmlString = data.contents;

            // --- IMPORTANT: Handle Base64 encoded Data URI from allorigins.win ---
            // If the content starts with 'data:', it's likely a Base64 encoded Data URI
            if (xmlString.startsWith('data:')) {
                const parts = xmlString.split(',');
                if (parts.length > 1) {
                    const base64EncodedXml = parts[1];
                    // Decode the Base64 string
                    xmlString = atob(base64EncodedXml);
                } else {
                    throw new Error("Invalid Data URI received from proxy.");
                }
            }
            // --- End Base64 decoding ---

            // Now, parse the 'xmlString' (which should be the decoded XML) as XML
            const xmlDoc = new window.DOMParser().parseFromString(xmlString, "text/xml");

            // --- Error handling for XML parsing itself ---
            // Check for potential XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                console.error("XML Parsing Error from allorigins.win contents:", parserError.textContent);
                // Optionally, log the string that caused the error for debugging:
                // console.error("Malformed XML string:", xmlString);
                throw new Error("Failed to parse RSS feed from proxy (XML error).");
            }
            // --- End XML error handling ---

            const items = xmlDoc.querySelectorAll("item");
            if (items.length === 0) {
                feedContainer.innerHTML = '<p class="no-alerts-message">No new alerts found at this time.</p>';
                return;
            }

            let html = '';
            items.forEach(item => {
                const titleElement = item.querySelector("title");
                const linkElement = item.querySelector("link");
                const descriptionElement = item.querySelector("description");
                const pubDateElement = item.querySelector("pubDate");

                const title = titleElement ? titleElement.textContent : 'No Title';
                const link = linkElement ? linkElement.textContent : '#';
                const description = descriptionElement ? descriptionElement.textContent : '';
                const pubDate = pubDateElement ? new Date(pubDateElement.textContent).toLocaleString('en-NZ', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                }) : 'N/A';

                // Basic check to avoid displaying description if it's just a repeat of the title
                const displayDescription = (description.trim().toLowerCase() !== title.trim().toLowerCase()) && description.trim() !== '';

                html += `
                    <div class="rss-item">
                        <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
                        <span class="date">${pubDate}</span>
                        ${displayDescription ? `<p>${description}</p>` : ''}
                    </div>
                `;
            });
            feedContainer.innerHTML = html;
        })
        .catch(error => {
            console.error('Overall Error fetching or parsing RSS feed:', error);
            feedContainer.innerHTML = '<p class="error-message">Failed to load alerts. Please check your internet connection or try again later. (Error: ' + error.message + ')</p>';
        });
});