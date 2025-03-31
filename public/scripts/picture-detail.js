const previewImg = document.getElementById('preview');
const downloadBtn = document.getElementById('downloadBtn');
const downloadStatus = document.getElementById('downloadStatus');
const metadataDiv = document.getElementById('metadata');

const pictureId = window.location.pathname.split('/').pop();
let hasWaited = false;

async function loadPictureDetails() {
  try {
    const response = await fetch(`/api/picture/${pictureId}`);
    if (!response.ok) throw new Error(await response.text() || 'Failed to load details');
    const { preview, logs, fileName } = await response.json();
    const uploadLog = logs.find(l => l.action === 'Uploaded') || {};

    // Extract original filename (e.g., "exterior_2.jpeg" from "upload_1_fc992afbb40b5cc0_exterior_2.jpeg")
    const originalFileName = fileName.split('_').slice(3).join('_') || fileName;

    previewImg.src = preview;
    metadataDiv.innerHTML = `
      <span>Uploaded Date: ${uploadLog.date || 'Not available'}</span>
      <span>Uploaded IP: ${uploadLog.ip || 'Not available'}</span>
      <span>Device: ${uploadLog.device || 'Not available'}</span>
      <span>File Name: ${originalFileName}</span>
    `;
  } catch (error) {
    downloadStatus.textContent = `Error: ${error.message}`;
  }
}

async function triggerDownload() {
  try {
    downloadBtn.disabled = true;

    if (!hasWaited) {
      let countdown = 10;
      downloadStatus.textContent = `Download starting in ${countdown}s...`;

      const countdownInterval = setInterval(() => {
        countdown--;
        downloadStatus.textContent = `Download starting in ${countdown}s...`;
        if (countdown <= 0) clearInterval(countdownInterval);
      }, 1000);

      const response = await fetch(`/api/download/${pictureId}`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text() || 'Failed to generate download link');
      const { downloadLink } = await response.json();

      setTimeout(() => {
        downloadStatus.textContent = 'Download started! (Expires in 1 hour)';
        const link = document.createElement('a');
        link.href = downloadLink;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        downloadBtn.disabled = false;
        hasWaited = true;
      }, 10000);
    } else {
      const response = await fetch(`/api/download/${pictureId}`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text() || 'Failed to generate download link');
      const { downloadLink } = await response.json();

      downloadStatus.textContent = 'Download started! (Expires in 1 hour)';
      const link = document.createElement('a');
      link.href = downloadLink;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      downloadBtn.disabled = false;
    }
  } catch (error) {
    downloadStatus.textContent = `Error: ${error.message}. Try again.`;
    downloadBtn.disabled = false;
  }
}

downloadBtn.addEventListener('click', triggerDownload);

loadPictureDetails();