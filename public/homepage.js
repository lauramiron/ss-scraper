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
