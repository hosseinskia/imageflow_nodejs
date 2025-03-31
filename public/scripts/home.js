const form = document.getElementById('imageForm');
const updatesContainer = document.getElementById('updates');
const processedLinksContainer = document.getElementById('processedLinks');
const errorContainer = document.getElementById('error');
const socketIdInput = document.getElementById('socketId');
const fileInfoContainer = document.getElementById('fileInfo');
const imageInput = document.getElementById('image');
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let socket;
if (isLocal) {
  socket = io();
  socket.on('connect', () => {
    socketIdInput.value = socket.id;
  });

  socket.on('processing-update', (data) => {
    updatesContainer.innerHTML = `<span class="tick">✔</span> ${data.message}`;
  });

  socket.on('processing-complete', (data) => {
    updatesContainer.innerHTML = '';
    processedLinksContainer.innerHTML = '';
    data.results.forEach(result => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = result.link;
      img.alt = 'Uploaded Image';
      img.style.cursor = 'pointer'; // Indicate clickable
      img.addEventListener('click', () => {
        window.location.href = `/pictures/${result.pictureId}`; // Navigate to picture details
      });
      const link = document.createElement('a');
      link.href = `/pictures/${result.pictureId}`; // Link to picture details
      link.textContent = result.link.split('/').pop();
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = link.href; // Navigate in same tab
      });
      div.appendChild(img);
      div.appendChild(link);
      processedLinksContainer.appendChild(div);
    });
    imageInput.value = '';
    fileInfoContainer.innerHTML = '';
  });

  socket.on('processing-error', (data) => {
    errorContainer.textContent = data.message;
    updatesContainer.innerHTML = '';
  });
}

imageInput.addEventListener('change', () => {
  const files = imageInput.files;
  fileInfoContainer.innerHTML = '';
  if (files.length === 0) return;

  const ul = document.createElement('ul');
  Array.from(files).forEach(file => {
    const li = document.createElement('li');
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    li.textContent = `${file.name} (${sizeInMB} MB)`;
    ul.appendChild(li);
  });
  fileInfoContainer.appendChild(ul);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  updatesContainer.innerHTML = '';
  processedLinksContainer.innerHTML = '';
  errorContainer.textContent = '';

  const formData = new FormData(form);
  const files = document.getElementById('image').files;

  if (files.length > 100) {
    errorContainer.textContent = 'Error: Maximum 100 images allowed.';
    return;
  }

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Upload failed');
    }

    if (!isLocal) {
      const data = await response.json();
      updatesContainer.innerHTML = '';
      processedLinksContainer.innerHTML = '';
      data.results.forEach(result => {
        const div = document.createElement('div');
        const img = document.createElement('img');
        img.src = result.link;
        img.alt = 'Uploaded Image';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          window.location.href = `/pictures/${result.pictureId}`;
        });
        const link = document.createElement('a');
        link.href = `/pictures/${result.pictureId}`;
        link.textContent = result.link.split('/').pop();
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = link.href;
        });
        div.appendChild(img);
        div.appendChild(link);
        processedLinksContainer.appendChild(div);
      });
      imageInput.value = '';
      fileInfoContainer.innerHTML = '';
    }
  } catch (error) {
    errorContainer.textContent = `Error: ${error.message}`;
    updatesContainer.innerHTML = '';
    console.error('Upload error:', error);
  }
});