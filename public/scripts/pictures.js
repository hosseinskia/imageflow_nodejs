const imageGallery = document.getElementById('imageGallery');
const deleteAllButton = document.getElementById('deleteAll');

async function loadImages() {
  imageGallery.innerHTML = '<p>Loading...</p>';
  try {
    const response = await fetch('/images');
    if (!response.ok) throw new Error(await response.text() || 'Failed to load images');
    const { images } = await response.json();

    imageGallery.innerHTML = '';
    if (!images || images.length === 0) {
      imageGallery.innerHTML = '<p>No pictures available yet.</p>';
      return;
    }

    images.forEach(({ link, pictureId }) => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = link;
      img.alt = 'Preview Image';
      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View';
      viewBtn.onclick = () => window.location.href = `/pictures/${pictureId}`;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => deleteImage(link.split('/').pop());
      div.appendChild(img);
      div.appendChild(viewBtn);
      div.appendChild(deleteBtn);
      imageGallery.appendChild(div);
    });
  } catch (error) {
    imageGallery.innerHTML = `<p>Error loading images: ${error.message}</p>`;
  }
}

async function deleteImage(file) {
  try {
    const response = await fetch(`/images/${file}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete image');
    loadImages();
  } catch (error) {
    alert(`Error deleting image: ${error.message}`);
  }
}

deleteAllButton.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete all images?')) {
    try {
      const response = await fetch('/images', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete all images');
      loadImages();
    } catch (error) {
      alert(`Error deleting all images: ${error.message}`);
    }
  }
});

loadImages();