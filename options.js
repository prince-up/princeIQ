// PrinceX Options Page Script

// Load saved settings
chrome.storage.sync.get(['enableAI', 'apiProvider', 'apiKey', 'model'], (result) => {
  document.getElementById('enableAI').checked = result.enableAI !== false;
  document.getElementById('apiProvider').value = result.apiProvider || 'openai';
  document.getElementById('apiKey').value = result.apiKey || '';
  document.getElementById('model').value = result.model || 'gpt-4o-mini';
});

// Update model options based on provider
document.getElementById('apiProvider').addEventListener('change', (e) => {
  const modelSelect = document.getElementById('model');
  const provider = e.target.value;
  
  modelSelect.innerHTML = '';
  
  if (provider === 'openai') {
    modelSelect.innerHTML = `
      <option value="gpt-4o-mini">GPT-4o Mini (Faster, Cheaper)</option>
      <option value="gpt-4o">GPT-4o (Best Quality)</option>
      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
    `;
  } else if (provider === 'anthropic') {
    modelSelect.innerHTML = `
      <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</option>
      <option value="claude-3-opus-20240229">Claude 3 Opus (Best)</option>
    `;
  } else if (provider === 'gemini') {
    modelSelect.innerHTML = `
      <option value="gemini-pro">Gemini Pro</option>
      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Faster)</option>
    `;
  }
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const settings = {
    enableAI: document.getElementById('enableAI').checked,
    apiProvider: document.getElementById('apiProvider').value,
    apiKey: document.getElementById('apiKey').value,
    model: document.getElementById('model').value
  };
  
  const statusDiv = document.getElementById('status');
  
  if (settings.enableAI && !settings.apiKey) {
    statusDiv.className = 'status error';
    statusDiv.textContent = '⚠️ Please enter an API key or disable AI explanations';
    return;
  }
  
  chrome.storage.sync.set(settings, () => {
    statusDiv.className = 'status success';
    statusDiv.textContent = '✓ Settings saved successfully!';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  });
});
