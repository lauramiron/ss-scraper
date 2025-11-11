async function scrapeService(service) {
  const button = event.target;
  const resultsDiv = document.getElementById(service + '-results');

  // Disable button and show loading
  button.disabled = true;
  resultsDiv.className = 'scrape-results visible loading';
  resultsDiv.innerHTML = '<div class="spinner"></div><p>Scraping ' + service + '... This may take 30-60 seconds.</p>';

  try {
    const response = await fetch('/' + service + '/scrape', {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + response.statusText);
    }

    const data = await response.json();

    // Display success results
    resultsDiv.className = 'scrape-results visible';
    resultsDiv.innerHTML = '<strong>Scrape successful!</strong><pre>' + JSON.stringify(data, null, 2) + '</pre>';

  } catch (error) {
    // Display error
    resultsDiv.className = 'scrape-results visible error';
    resultsDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
    button.disabled = false;
  }
}

async function loadScreenshots() {
  const screenshotsList = document.getElementById('screenshots-list');

  try {
    const response = await fetch('/screenshots');

    if (!response.ok) {
      throw new Error('Failed to load screenshots');
    }

    const screenshots = await response.json();

    if (screenshots.length === 0) {
      screenshotsList.innerHTML = '<p class="no-screenshots">No screenshots available</p>';
      return;
    }

    // Helper function to format file size
    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Helper function to format timestamp
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    }

    // Build HTML for screenshots list
    const html = screenshots.map(screenshot => `
      <div class="screenshot-item">
        <div class="screenshot-info">
          <div class="screenshot-name">${screenshot.name}</div>
          <div class="screenshot-meta">${formatDate(screenshot.timestamp)} • ${formatBytes(screenshot.size)}</div>
        </div>
        <a href="/screenshots/${screenshot.name}" download class="screenshot-download">Download</a>
      </div>
    `).join('');

    screenshotsList.innerHTML = html;

  } catch (error) {
    console.error('Error loading screenshots:', error);
    screenshotsList.innerHTML = '<p class="no-screenshots">Error loading screenshots</p>';
  }
}

// Load screenshots when page loads
document.addEventListener('DOMContentLoaded', loadScreenshots);
