// Main observer for ChatGPT interface
const observeDOM = () => {
  const chatContainer = document.querySelector('main');
  if (!chatContainer) {
    // If the chat container doesn't exist yet, try again in a moment
    setTimeout(observeDOM, 500);
    return;
  }
  
  // Create and inject the navigation panel once we have the chat container
  createNavigationPanel();
  
  // Set up the observer to watch for new messages
  const observer = new MutationObserver(handleDOMChanges);
  observer.observe(chatContainer, { childList: true, subtree: true });
};

// Create the navigation panel
const createNavigationPanel = () => {
  // Check if panel already exists
  if (document.getElementById('gpt-navigator-panel')) {
    return;
  }
  
  // Create the navigation panel container
  const navPanel = document.createElement('div');
  navPanel.id = 'gpt-navigator-panel';
  navPanel.className = 'gpt-navigator-panel';
  
  // Add header to the panel
  const navHeader = document.createElement('div');
  navHeader.className = 'gpt-navigator-header';
  navHeader.innerHTML = '<h3>Prompt Navigator</h3>';
  navPanel.appendChild(navHeader);
  
  // Create the links container
  const navLinks = document.createElement('div');
  navLinks.className = 'gpt-navigator-links';
  navLinks.id = 'gpt-navigator-links';
  navPanel.appendChild(navLinks);
  
  // Add toggle button
  const toggleButton = document.createElement('button');
  toggleButton.className = 'gpt-navigator-toggle';
  toggleButton.innerHTML = '&laquo;';
  toggleButton.addEventListener('click', () => {
    navPanel.classList.toggle('collapsed');
    toggleButton.innerHTML = navPanel.classList.contains('collapsed') ? '&raquo;' : '&laquo;';
  });
  navPanel.appendChild(toggleButton);
  
  // Add the panel to the body
  document.body.appendChild(navPanel);
  
  // Now scan existing content
  scanExistingPrompts();
};

// Handler for DOM changes
const handleDOMChanges = (mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      scanExistingPrompts();
    }
  }
};

// Debug function to log extracted content
const debugLog = (message, data) => {
  if (false) { // Logging disabled in production
    console.log(`[GPT Navigator] ${message}`, data);
  }
};

// Scan existing prompts and add to navigation
const scanExistingPrompts = () => {
  const navLinks = document.getElementById('gpt-navigator-links');
  if (!navLinks) return;
  
  // Clear existing links
  navLinks.innerHTML = '';
  
  try {
    // Find all user messages - updated selectors for the new ChatGPT structure
    // Look for all elements with data-message-author-role="user"
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    
    debugLog('Found user messages:', userMessages.length);
    
    userMessages.forEach((messageElement, index) => {
      // Extract the user's text input using improved method
      const userInput = extractUserInput(messageElement);
      
      if (userInput && userInput.trim()) {
        // Create a trimmed version for the link text
        // Handle HTML content in the input by first creating a temp element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = userInput;
        
        // Extract and format the text
        const rawText = tempDiv.textContent || '';
        const shortText = rawText.length > 60  // Increased length to show more text 
          ? rawText.substring(0, 57) + '...' 
          : rawText;
        
        // Create link element with styled index number
        const linkElement = document.createElement('a');
        linkElement.className = 'gpt-navigator-link';
        
        // Create number badge element
        const numberBadge = document.createElement('span');
        numberBadge.className = 'gpt-navigator-number';
        numberBadge.textContent = (index + 1).toString();
        
        // Create text content element - using innerHTML to preserve styling
        const textSpan = document.createElement('span');
        textSpan.className = 'gpt-navigator-text';
        
        // Apply styling to code indicator if present
        let formattedText = userInput;
        if (formattedText.includes('<i>[..code..]</i>')) {
          textSpan.innerHTML = formattedText;
        } else {
          textSpan.textContent = shortText;
        }
        
        // Add both elements to the link
        linkElement.appendChild(numberBadge);
        linkElement.appendChild(document.createTextNode(' '));
        linkElement.appendChild(textSpan);
        
        linkElement.href = '#';
        linkElement.setAttribute('data-message-index', index);
        
        // Add click event to scroll to the message - using initial version logic
        linkElement.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Find the closest parent div that contains the entire message group - from initial version
          const messageGroup = findMessageGroup(messageElement);
          if (messageGroup) {
            messageGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Add highlight effect
            messageGroup.classList.add('gpt-navigator-highlight');
            setTimeout(() => {
              messageGroup.classList.remove('gpt-navigator-highlight');
            }, 2000);
          } else {
            // Fallback to original element if group not found
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            messageElement.classList.add('gpt-navigator-highlight');
            setTimeout(() => {
              messageElement.classList.remove('gpt-navigator-highlight');
            }, 2000);
          }
        });
        
        navLinks.appendChild(linkElement);
      }
    });
  } catch (error) {
    console.error('[GPT Navigator] Error scanning prompts:', error);
  }
};

// Extract the user's input text using various methods
const extractUserInput = (userElement) => {
  try {
    let userInput = '';
    
    // Try multiple strategies to get the user's input text
    
    // Strategy 1: Extract text from paragraphs within user message
    // This typically gets the direct user input
    const paragraphs = userElement.querySelectorAll('p');
    if (paragraphs.length > 0) {
      // First collect all paragraph texts
      const allTexts = Array.from(paragraphs).map(p => p.textContent?.trim() || '');
      const fullText = allTexts.join(' ');
      
      // Check if the full text contains code blocks
      if (fullText.includes('```')) {
        // Extract non-code parts for better context
        const textParts = fullText.split(/```[\s\S]*?```/);
        // Join the non-code parts and add code marker
        userInput = textParts.filter(Boolean).join(' ') + ' <i>[..code..]</i>';
      } else {
        userInput = fullText;
      }
      
      if (userInput) return userInput;
    }
    
    // Strategy 2: Look for code blocks which may contain user code
    const codeBlocks = userElement.querySelectorAll('pre code');
    if (codeBlocks.length > 0) {
      // Get surrounding text to provide context
      const directText = userElement.textContent?.trim() || '';
      
      // Extract code blocks
      const codeTexts = Array.from(codeBlocks).map(el => el.textContent?.trim() || '');
      
      // Replace each code block with marker in the text
      let resultText = directText;
      codeTexts.forEach(codeText => {
        if (codeText && resultText.includes(codeText)) {
          resultText = resultText.replace(codeText, '');
        }
      });
      
      // Clean up whitespace and add code marker
      resultText = resultText.replace(/\s+/g, ' ').trim();
      
      // Add code marker in a way that it can be styled
      if (resultText) {
        return resultText + ' <i>[..code..]</i>';
      } else {
        return '<i>[..code..]</i>';
      }
    }
    
    // Strategy 3: Find the text directly in the user element
    // Useful for simple messages without formatting
    let directText = userElement.textContent?.trim() || '';
    
    // Check for code blocks in the direct text content
    if (directText.includes('```')) {
      // Extract content before, between and after code blocks
      const textParts = directText.split(/```[\s\S]*?```/);
      const nonCodeText = textParts.filter(Boolean).join(' ').trim();
      
      if (nonCodeText) {
        return nonCodeText + ' <i>[..code..]</i>';
      } else {
        return '<i>[..code..]</i>';
      }
    }
    
    if (directText) {
      return directText;
    }
    
    return userInput || 'User message';
  } catch (error) {
    console.error('[GPT Navigator] Error extracting user input:', error);
    return 'User message';
  }
};

// Helper function to find the message group container - from initial version
const findMessageGroup = (element) => {
  // First try to find the direct parent with a specific class
  let parent = element;
  
  // Go up to 5 levels to find a suitable container
  for (let i = 0; i < 5; i++) {
    parent = parent.parentElement;
    if (!parent) break;
    
    // Look for common container classes in the new ChatGPT interface
    if (parent.classList.contains('w-full') && 
        (parent.classList.contains('text-token-text-primary') || 
         parent.classList.contains('text-base'))) {
      return parent;
    }
  }
  
  return element;
};

// Start observing DOM
document.addEventListener('DOMContentLoaded', observeDOM);
// Also run immediately in case the DOM is already loaded
observeDOM(); 