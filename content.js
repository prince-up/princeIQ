// PrinceX Content Script - Detects highlighted text and shows explanation

let explanationPanel = null;
let isSelecting = false;
let panelJustOpened = false;

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

function handleTextSelection(event) {
  setTimeout(() => {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText.length > 0 && selectedText.length < 200) {
      showExplanationButton(selectedText, event);
    } else {
      hideExplanationPanel();
    }
  }, 100);
}

function showExplanationButton(text, event) {
  // Remove existing panel
  hideExplanationPanel();
  
  // Create button to trigger explanation
  const button = document.createElement('div');
  button.id = 'princex-trigger-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    Explain
  `;
  
  // Position near selection
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  button.style.position = 'fixed';
  button.style.left = `${rect.left + rect.width / 2}px`;
  button.style.top = `${rect.top - 45}px`;
  button.style.transform = 'translateX(-50%)';
  
  button.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // Set flag before opening
    panelJustOpened = true;
    showExplanation(text, button);
  };
  
  document.body.appendChild(button);
  explanationPanel = button;
}

async function showExplanation(text, triggerElement) {
  // Remove trigger button
  triggerElement.remove();
  
  // Set flag to prevent immediate closing
  panelJustOpened = true;
  
  // Create explanation panel
  const panel = document.createElement('div');
  panel.id = 'princex-explanation-panel';
  panel.innerHTML = `
    <div class="princex-header">
      <div class="princex-logo">PrinceX</div>
      <button class="princex-close" id="princex-close-btn">&times;</button>
    </div>
    <div class="princex-content">
      <div class="princex-loading">
        <div class="spinner"></div>
        <p>Analyzing "${text}"...</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  explanationPanel = panel;
  
  // Close button handler
  document.getElementById('princex-close-btn').onclick = (e) => {
    e.stopPropagation();
    hideExplanationPanel();
  };
  
  // Prevent clicks inside panel from closing it
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  }, true);
  
  // Allow closing after 1000ms (1 second delay)
  setTimeout(() => {
    panelJustOpened = false;
  }, 1000);
  
  // Get explanation
  const explanation = await generateExplanation(text);
  
  // Update panel with explanation
  const content = panel.querySelector('.princex-content');
  content.innerHTML = explanation;
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
      // Fallback to generic explanation
      return formatExplanation(text, builtInData);
    }
  }
  
  // Fallback to generic explanation
  return formatExplanation(text, builtInData);
}

async function getAIExplanation(term, settings) {
  const prompt = `You are PrinceX, an expert Computer Science professor and software engineer.

Explain the concept: "${term}"

Provide a structured explanation in JSON format with these exact fields:

{
  "subject": "DSA|OS|CN|DBMS|OOP|null (choose the most relevant CS subject, or null if not CS-specific)",
  "definition": "2-3 simple lines explaining what this is",
  "analogy": "A real-life analogy that's easy to understand",
  "technical": "Clear but concise technical explanation with complexity/properties if applicable",
  "diagram": "Description of a simple text-based diagram using boxes/arrows/text",
  "code": "A clear code example in the most suitable language (C/C++/Java/Python)",
  "mistakes": ["mistake1", "mistake2", "mistake3"],
  "tip": "1-2 line exam/interview tip"
}

Rules:
- Keep language simple and clear
- Avoid unnecessary theory
- Focus on practical understanding
- If it's not a CS concept, still provide helpful context and relate to technology
- Code should be functional and well-commented`;

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
        {
          role: 'system',
          content: 'You are a helpful CS professor. Always respond with valid JSON only, no markdown or extra text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
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
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nRespond with ONLY valid JSON, no other text.'
        }
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.content[0].text;
  // Claude might wrap in ```json, so clean it
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

async function callGemini(prompt, apiKey, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt + '\n\nRespond with ONLY valid JSON, no other text.'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

function getExplanationData(term) {
  // Knowledge base for common CS terms
  const concepts = {
    'binary search': {
      subject: 'DSA',
      definition: 'Binary Search is a searching algorithm that finds the position of a target value within a sorted array. It compares the target value to the middle element and eliminates half of the search space in each step.',
      analogy: 'Think of finding a word in a dictionary. You open it in the middle, check if your word comes before or after, then repeat with the relevant half. You never read every page.',
      technical: 'Binary Search works only on sorted arrays. It starts at the middle index, compares the target with the middle element. If target is smaller, search the left half. If larger, search the right half. Repeat until found or search space is empty. Time complexity: O(log n).',
      diagram: 'Array: [2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 78]\nTarget: 23\nStep 1: Check middle (16) → go right\nStep 2: Check middle of right half (56) → go left\nStep 3: Check middle (23) → Found!',
      code: `# Python - Binary Search
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid  # Found
        elif arr[mid] < target:
            left = mid + 1  # Search right
        else:
            right = mid - 1  # Search left
    
    return -1  # Not found

# Example
arr = [2, 5, 8, 12, 16, 23, 38, 45]
result = binary_search(arr, 23)
print(f"Found at index: {result}")  # Output: 5`,
      mistakes: [
        'Forgetting to sort the array first',
        'Using wrong mid calculation (can cause overflow in some languages)',
        'Not handling the case when element is not found',
        'Confusing left/right pointer updates (off-by-one errors)'
      ],
      tip: 'Remember: Binary Search only works on SORTED data. In interviews, always verify the array is sorted first. Time complexity O(log n) is the key advantage over linear search O(n).'
    },
    'stack': {
      subject: 'DSA',
      definition: 'A Stack is a linear data structure that follows the Last-In-First-Out (LIFO) principle. The element added most recently is the first one to be removed.',
      analogy: 'Think of a stack of plates in a cafeteria. You can only add a plate on top (push) and remove the top plate (pop). You cannot take a plate from the middle or bottom without removing the ones above it.',
      technical: 'Stack supports two main operations: Push (add element to top) and Pop (remove element from top). Additional operations include Peek/Top (view top element without removing) and isEmpty (check if stack is empty). Implemented using arrays or linked lists. Time complexity: O(1) for all operations.',
      diagram: 'Initial Stack: [10, 20, 30] (30 is top)\n\nPush(40):\n[10, 20, 30, 40] ← 40 is now top\n\nPop():\n[10, 20, 30] ← removed 40\n\nPeek():\n30 ← just view, don\'t remove',
      code: `# Python - Stack Implementation
class Stack:
    def __init__(self):
        self.items = []
    
    def push(self, item):
        self.items.append(item)
    
    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        return None
    
    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        return None
    
    def is_empty(self):
        return len(self.items) == 0

# Example usage
stack = Stack()
stack.push(10)
stack.push(20)
stack.push(30)
print(stack.pop())   # Output: 30
print(stack.peek())  # Output: 20`,
      mistakes: [
        'Trying to pop from an empty stack (causes underflow)',
        'Not checking isEmpty() before pop/peek operations',
        'Confusing Stack (LIFO) with Queue (FIFO)',
        'Forgetting that arrays have a maximum size in some languages'
      ],
      tip: 'Key interview uses: Function call stack, undo operations, expression evaluation, backtracking algorithms. Remember LIFO - Last In, First Out!'
    },
    'deadlock': {
      subject: 'Operating Systems',
      definition: 'Deadlock is a situation where two or more processes are unable to proceed because each is waiting for the other to release a resource. All processes remain blocked indefinitely.',
      analogy: 'Imagine two people facing each other in a narrow hallway. Person A waits for Person B to move, while Person B waits for Person A to move. Neither can proceed, and they are stuck forever unless someone gives way.',
      technical: 'Deadlock occurs when four conditions hold simultaneously: Mutual Exclusion (resources cannot be shared), Hold and Wait (process holding resources can request more), No Preemption (resources cannot be forcibly taken), and Circular Wait (circular chain of processes waiting for resources). Prevention involves breaking at least one condition.',
      diagram: 'Process P1 holds Resource R1, needs Resource R2\n       ↓ holds        ↓ needs\n      R1 ←----------→ R2\n       ↑ needs        ↑ holds\nProcess P2 holds Resource R2, needs Resource R1\n\nCircular Wait: P1 → R2 → P2 → R1 → P1',
      code: `# Python - Deadlock Example (DON'T DO THIS!)
import threading

lock1 = threading.Lock()
lock2 = threading.Lock()

def thread1_work():
    lock1.acquire()
    print("Thread 1: acquired lock1")
    # Simulating some work
    import time; time.sleep(0.1)
    
    lock2.acquire()  # Waiting for lock2
    print("Thread 1: acquired lock2")
    lock2.release()
    lock1.release()

def thread2_work():
    lock2.acquire()
    print("Thread 2: acquired lock2")
    import time; time.sleep(0.1)
    
    lock1.acquire()  # Waiting for lock1 (DEADLOCK!)
    print("Thread 2: acquired lock1")
    lock1.release()
    lock2.release()

# This will cause deadlock
t1 = threading.Thread(target=thread1_work)
t2 = threading.Thread(target=thread2_work)
t1.start()
t2.start()`,
      mistakes: [
        'Not acquiring locks in a consistent order across threads',
        'Holding locks while waiting for other resources',
        'Not using timeout mechanisms for lock acquisition',
        'Ignoring deadlock prevention strategies in design'
      ],
      tip: 'In exams, identify all 4 Coffman conditions. In interviews, mention prevention strategies: Lock ordering, timeouts, deadlock detection algorithms, or avoiding hold-and-wait by requesting all resources at once.'
    }
  };
  
  const normalizedTerm = term.toLowerCase().trim();
  
  if (concepts[normalizedTerm]) {
    return concepts[normalizedTerm];
  }
  
  // Generic response for unknown terms
  return {
    subject: null,
    definition: `${term} refers to a concept or term that may be related to computer science, programming, or technology.`,
    analogy: 'Without specific context, this term could have multiple meanings across different domains.',
    technical: `The term "${term}" should be analyzed in its specific context. It may relate to algorithms, data structures, system design, or other technical areas.`,
    diagram: 'Context-specific diagram would depend on the exact meaning and application of this term.',
    code: `// Example context needed
// "${term}" - please provide more context for a specific code example`,
    mistakes: [
      'Using terms without understanding their specific context',
      'Confusing similar-sounding concepts',
      'Not verifying definitions from reliable sources'
    ],
    tip: `When encountering "${term}", always check the context and domain to understand its specific meaning in that area.`
  };
}

function formatExplanation(term, data) {
  const subjectBadge = data.subject ? `<span class="subject-badge">${data.subject}</span>` : '';
  
  return `
    <div class="explanation-section">
      <h2 class="term-title">${term} ${subjectBadge}</h2>
    </div>
    
    <div class="explanation-section">
      <h3>Short Definition</h3>
      <p>${data.definition}</p>
    </div>
    
    <div class="explanation-section">
      <h3>Real-Life Analogy</h3>
      <p>${data.analogy}</p>
    </div>
    
    <div class="explanation-section">
      <h3>Technical Explanation</h3>
      <p>${data.technical}</p>
    </div>
    
    <div class="explanation-section">
      <h3>Visual Diagram</h3>
      <pre class="diagram">${data.diagram}</pre>
    </div>
    
    <div class="explanation-section">
      <h3>Code Example</h3>
      <pre class="code-example">${escapeHtml(data.code)}</pre>
    </div>
    
    <div class="explanation-section">
      <h3>Common Mistakes</h3>
      <ul class="mistakes-list">
        ${data.mistakes.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>
    
    <div class="explanation-section tip-section">
      <h3>Exam / Interview Tip</h3>
      <p>${data.tip}</p>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function hideExplanationPanel() {
  if (explanationPanel) {
    explanationPanel.remove();
    explanationPanel = null;
  }
}

// Close panel when clicking outside (with delay to prevent immediate close)
document.addEventListener('click', (e) => {
  // Don't close if panel just opened
  if (panelJustOpened) {
    return;
  }
  
  if (explanationPanel && 
      !explanationPanel.contains(e.target) && 
      !e.target.closest('#princex-trigger-btn') &&
      e.target.id !== 'princex-trigger-btn') {
    hideExplanationPanel();
  }
}, true);

// Close panel on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && explanationPanel) {
    hideExplanationPanel();
  }
});
