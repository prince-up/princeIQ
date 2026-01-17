// PrinceX Popup Script - Explains highlighted text

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.container');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get selected text from the page
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim()
    });
    
    const selectedText = result[0]?.result;
    
    if (selectedText && selectedText.length > 0) {
      // Show explanation for selected text
      showExplanation(selectedText);
    } else {
      // Show default instructions
      showDefaultView();
    }
  } catch (error) {
    console.error('Error:', error);
    showDefaultView();
  }
});

async function showDefaultView() {
  const container = document.querySelector('.container');
  
  // Check if AI is configured
  const settings = await chrome.storage.sync.get(['enableAI', 'apiKey']);
  const hasAPI = settings.enableAI && settings.apiKey;
  
  const setupMessage = hasAPI 
    ? `<div class="info-box success">
        <h3>✓ AI Configured</h3>
        <p>You can now explain ANY concept! Just highlight text and click the PrinceX icon.</p>
      </div>`
    : `<div class="info-box warning">
        <h3>⚠️ Setup Required</h3>
        <p>To explain ANY concept, you need an OpenAI API key.</p>
        <button id="setupBtn" class="setup-btn">Configure API Key</button>
      </div>`;
  
  container.innerHTML = `
    <div class="logo">PrinceX</div>
    <div class="tagline">Your CS Concept Companion</div>
    
    ${setupMessage}
    
    <div class="info-box">
      <h3>📝 How to Use</h3>
      <ul class="steps">
        <li>Highlight any text on the page</li>
        <li>Click the PrinceX icon</li>
        <li>Get instant explanations</li>
      </ul>
    </div>

    <div class="info-box">
      <h3>🎯 Free Concepts (No API needed)</h3>
      <p>Binary Search, Stack, Deadlock</p>
    </div>

    <div class="info-box">
      <h3>🌐 Works On</h3>
      <p>GitHub, VS Code, Stack Overflow, LeetCode, GeeksforGeeks, PDFs, and more!</p>
    </div>

    <div class="footer">
      Made for CS Students
      <div class="version">v1.0.0</div>
    </div>
  `;
  
  // Add event listener for setup button
  const setupBtn = document.getElementById('setupBtn');
  if (setupBtn) {
    setupBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

async function showExplanation(text) {
  const container = document.querySelector('.container');
  
  container.innerHTML = `
    <div class="explanation-header">
      <div class="logo-small">PrinceX</div>
      <div class="selected-term">"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"</div>
    </div>
    
    <div class="explanation-body">
      <div class="loading">
        <div class="spinner"></div>
        <p>Analyzing concept...</p>
      </div>
    </div>
  `;
  
  // Get explanation
  const explanation = await generateExplanation(text);
  
  const explanationBody = container.querySelector('.explanation-body');
  explanationBody.innerHTML = explanation;
}

async function generateExplanation(text) {
  // Check if we have a built-in explanation first
  const builtInData = getExplanationData(text);
  const normalizedTerm = text.toLowerCase().trim();
  
  // If it's a known concept, use built-in explanation
  const knownConcepts = ['binary search', 'stack', 'deadlock'];
  if (knownConcepts.includes(normalizedTerm)) {
    return formatExplanation(text, builtInData);
  }
  
  // Otherwise, try AI-powered explanation
  const settings = await chrome.storage.sync.get(['enableAI', 'apiProvider', 'apiKey', 'model']);
  
  if (settings.enableAI && settings.apiKey) {
    try {
      const aiExplanation = await getAIExplanation(text, settings);
      return formatExplanation(text, aiExplanation);
    } catch (error) {
      console.error('AI explanation failed:', error);
      return formatExplanation(text, builtInData);
    }
  }
  
  // Fallback to generic explanation
  return formatExplanation(text, builtInData);
}

function getExplanationData(term) {
  const concepts = {
    'binary search': {
      subject: 'DSA',
      definition: 'Binary Search is a searching algorithm that finds the position of a target value within a sorted array. It compares the target value to the middle element and eliminates half of the search space in each step.',
      analogy: 'Think of finding a word in a dictionary. You open it in the middle, check if your word comes before or after, then repeat with the relevant half.',
      technical: 'Binary Search works only on sorted arrays. Time complexity: O(log n). Space complexity: O(1) for iterative, O(log n) for recursive.',
      code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
      mistakes: ['Forgetting array must be sorted', 'Off-by-one errors', 'Integer overflow in mid calculation'],
      tip: 'Always verify the array is sorted first. Time complexity O(log n) is the key advantage.'
    },
    'stack': {
      subject: 'DSA',
      definition: 'A Stack is a linear data structure that follows the Last-In-First-Out (LIFO) principle. The element added most recently is the first one to be removed.',
      analogy: 'Think of a stack of plates. You can only add a plate on top and remove the top plate.',
      technical: 'Stack supports Push (add to top) and Pop (remove from top) operations. Both are O(1). Implemented using arrays or linked lists.',
      code: `class Stack:
    def __init__(self):
        self.items = []
    
    def push(self, item):
        self.items.append(item)
    
    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        return None`,
      mistakes: ['Popping from empty stack', 'Confusing Stack (LIFO) with Queue (FIFO)', 'Not checking isEmpty()'],
      tip: 'Remember LIFO - Last In, First Out! Used in function calls, undo operations, expression evaluation.'
    },
    'deadlock': {
      subject: 'Operating Systems',
      definition: 'Deadlock is a situation where two or more processes are unable to proceed because each is waiting for the other to release a resource.',
      analogy: 'Two people in a narrow hallway, each waiting for the other to move first. Nobody can proceed.',
      technical: 'Four Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Prevention requires breaking at least one condition.',
      code: `# Deadlock example
lock1.acquire()
lock2.acquire()  # Thread 1

lock2.acquire()
lock1.acquire()  # Thread 2 (DEADLOCK!)

# Prevention: Same lock order
lock1.acquire()
lock2.acquire()  # Both threads`,
      mistakes: ['Not acquiring locks in consistent order', 'Holding locks while waiting', 'No timeout mechanisms'],
      tip: 'In exams, identify all 4 Coffman conditions. Mention lock ordering as prevention strategy.'
    }
  };
  
  const normalizedTerm = term.toLowerCase().trim();
  
  if (concepts[normalizedTerm]) {
    return concepts[normalizedTerm];
  }
  
  return {
    subject: null,
    definition: `"${term}" - This concept requires AI analysis or more context for a detailed explanation.`,
    analogy: 'Enable AI in settings to get explanations for any concept!',
    technical: 'Configure your OpenAI API key in the extension settings to unlock unlimited explanations.',
    code: '// AI explanations available with API key',
    mistakes: ['Not enabling AI for unknown concepts'],
    tip: 'Right-click the PrinceX icon and go to Options to configure AI.'
  };
}

async function getAIExplanation(term, settings) {
  const prompt = `You are PrinceX, an expert Computer Science professor.

Explain: "${term}"

Provide JSON with these fields:
{
  "subject": "DSA|OS|CN|DBMS|OOP|null",
  "definition": "2-3 simple lines",
  "analogy": "Real-life analogy",
  "technical": "Technical explanation",
  "code": "Code example with comments",
  "mistakes": ["mistake1", "mistake2", "mistake3"],
  "tip": "Exam/interview tip"
}

Keep it simple and practical.`;

  const provider = settings.apiProvider || 'openai';
  const model = settings.model || 'gpt-4o-mini';
  
  if (provider === 'openai') {
    return await callOpenAI(prompt, settings.apiKey, model);
  } else if (provider === 'anthropic') {
    return await callAnthropic(prompt, settings.apiKey, model);
  } else if (provider === 'gemini') {
    return await callGemini(prompt, settings.apiKey, model);
  }
  
  throw new Error('Unsupported AI provider');
}

async function callOpenAI(prompt, apiKey, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful CS professor. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  });
  
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callAnthropic(prompt, apiKey, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt + '\n\nRespond with ONLY valid JSON.' }]
    })
  });
  
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  
  const data = await response.json();
  const content = data.content[0].text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(content);
}

async function callGemini(prompt, apiKey, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + '\n\nRespond with ONLY valid JSON.' }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    }
  );
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  
  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(content);
}

function formatExplanation(term, data) {
  const subjectBadge = data.subject ? `<span class="subject-badge">${data.subject}</span>` : '';
  
  return `
    <div class="exp-section">
      <h2 class="term-title">${term} ${subjectBadge}</h2>
    </div>
    
    <div class="exp-section">
      <h3>Definition</h3>
      <p>${data.definition}</p>
    </div>
    
    <div class="exp-section">
      <h3>Analogy</h3>
      <p>${data.analogy}</p>
    </div>
    
    <div class="exp-section">
      <h3>Technical</h3>
      <p>${data.technical}</p>
    </div>
    
    <div class="exp-section">
      <h3>Code Example</h3>
      <pre class="code">${escapeHtml(data.code)}</pre>
    </div>
    
    <div class="exp-section">
      <h3>Common Mistakes</h3>
      <ul class="mistakes">
        ${data.mistakes.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>
    
    <div class="exp-section tip">
      <h3>💡 Tip</h3>
      <p>${data.tip}</p>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
