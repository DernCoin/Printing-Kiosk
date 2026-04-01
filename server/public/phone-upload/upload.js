// Phone upload — vanilla JS, no framework
(function () {
  const fileInput = document.getElementById('file-input');
  const uploadLabel = document.getElementById('upload-label');
  const uploadSection = document.getElementById('upload-section');
  const progressSection = document.getElementById('progress-section');
  const successSection = document.getElementById('success-section');
  const errorSection = document.getElementById('error-section');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const statusText = document.getElementById('status-text');
  const errorMessage = document.getElementById('error-message');
  const retryButton = document.getElementById('retry-button');

  // Get session ID from URL params
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');

  // Get server base URL (same origin)
  const baseUrl = window.location.origin;

  function showSection(section) {
    uploadSection.classList.add('hidden');
    progressSection.classList.add('hidden');
    successSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    section.classList.remove('hidden');
  }

  function showError(message) {
    errorMessage.textContent = message;
    showSection(errorSection);
  }

  async function uploadFile(file) {
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showError('File is too large. Maximum size is 50 MB.');
      return;
    }

    showSection(progressSection);
    statusText.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', 'phone');
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', baseUrl + '/api/files/upload');
    xhr.setRequestHeader('x-client-type', 'phone');
    if (sessionId) {
      xhr.setRequestHeader('x-session-id', sessionId);
    }

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = pct + '%';
      }
    });

    xhr.addEventListener('load', function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        showSection(successSection);
      } else {
        let msg = 'Upload failed. Please try again.';
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.error) msg = resp.error;
        } catch (e) {}
        showError(msg);
      }
    });

    xhr.addEventListener('error', function () {
      showError('Connection failed. Please check your WiFi and try again.');
    });

    xhr.addEventListener('timeout', function () {
      showError('Upload timed out. Please try again.');
    });

    xhr.timeout = 120000; // 2 minutes
    xhr.send(formData);
  }

  // File input change
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) {
      uploadFile(fileInput.files[0]);
    }
  });

  // Retry button
  retryButton.addEventListener('click', function () {
    fileInput.value = '';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    showSection(uploadSection);
  });
})();
