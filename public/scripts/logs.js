const logContent = document.getElementById('logContent');

async function checkImageExists(imageLink) {
  try {
    const previewLink = imageLink.replace('/pictures/', '/previews/upload_') + '_'; // Rough approximation
    const response = await fetch(previewLink, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadLogs() {
  logContent.innerHTML = '<p>Loading...</p>';
  try {
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error('Failed to load logs');
    }
    const logs = await response.json();
    logContent.innerHTML = '';
    if (logs.length === 0) {
      logContent.innerHTML = '<p>No logs available.</p>';
      return;
    }

    for (const log of logs) {
      const div = document.createElement('div');
      const text = `${log.date} | IP: ${log.ip} | Device: ${log.device} | Action: ${log.action}`;
      div.textContent = text;

      if (log.imageLink && log.action !== 'Deleted' && log.action !== 'Deleted All') {
        const imageExists = await checkImageExists(log.imageLink);
        if (imageExists) {
          const link = document.createElement('a');
          link.href = log.imageLink;
          link.textContent = 'View Image';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = link.href; // Navigate in same tab
          });
          div.appendChild(link);
        }
      }

      logContent.appendChild(div);
    }
  } catch (error) {
    logContent.innerHTML = `<p>Error: ${error.message}</p>`;
    console.error('Load logs error:', error);
  }
}

loadLogs();