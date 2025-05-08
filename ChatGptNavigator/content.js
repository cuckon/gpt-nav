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
  
  // Set up the observer to watch for new messages and conversation changes
  const observer = new MutationObserver((mutations) => {
    handleDOMChanges(mutations);
    checkForConversationChange(); // Check for conversation change on DOM updates
  });
  observer.observe(chatContainer, { childList: true, subtree: true });
  
  // Add window resize handler to adjust panel layout if needed
  window.addEventListener('resize', adjustPanelOnResize);
  
  // Initial check for conversation ID and load bookmarks
  currentConversationId = getConversationId();
  loadBookmarks();
};

// Store panel width variables
let userPanelWidth = {
  default: 280,
  medium: 240,
  small: 220,
  current: null
};

// Display mode state: 'float' or 'embed'
let currentDisplayMode = 'float'; // Default to float

// Get default width based on screen size
const getDefaultPanelWidth = () => {
  if (window.innerWidth <= 640) {
    return userPanelWidth.small;
  } else if (window.innerWidth <= 1024) {
    return userPanelWidth.medium;
  } else {
    return userPanelWidth.default;
  }
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
  
  // Add title and bookmark filter button
  const headerContent = document.createElement('div');
  headerContent.style.display = 'flex';
  headerContent.style.justifyContent = 'space-between';
  headerContent.style.alignItems = 'center';
  headerContent.style.width = '100%';
  
  const title = document.createElement('h3');
  title.textContent = 'Prompt Navigator';
  
  const actionsContainer = document.createElement('div');
  actionsContainer.style.display = 'flex';
  actionsContainer.style.gap = '8px';
  actionsContainer.style.alignItems = 'center';
  
  // Create GitHub link
  const githubLink = document.createElement('a');
  githubLink.href = 'https://github.com/cuckon/gpt-nav';
  githubLink.target = '_blank';
  githubLink.className = 'gpt-navigator-github';
  githubLink.title = 'View on GitHub';
  githubLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>';
  
  const filterButton = document.createElement('button');
  filterButton.className = 'gpt-navigator-filter';
  filterButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> <span>Bookmarks</span>';
  filterButton.title = 'Show only bookmarked prompts';
  filterButton.addEventListener('click', toggleBookmarkFilter);
  
  const displayModeButton = document.createElement('button');
  displayModeButton.className = 'gpt-navigator-display-mode';
  displayModeButton.title = 'Toggle panel display mode';
  // Icon will be set in applyDisplayMode
  displayModeButton.addEventListener('click', toggleDisplayMode);
  
  actionsContainer.appendChild(githubLink);
  actionsContainer.appendChild(filterButton);
  actionsContainer.appendChild(displayModeButton);
  
  headerContent.appendChild(title);
  headerContent.appendChild(actionsContainer);
  navHeader.appendChild(headerContent);
  navPanel.appendChild(navHeader);
  
  // Create the links container
  const navLinks = document.createElement('div');
  navLinks.className = 'gpt-navigator-links';
  navLinks.id = 'gpt-navigator-links';
  navPanel.appendChild(navLinks);
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'gpt-navigator-resize-handle';
  navPanel.appendChild(resizeHandle);
  
  // Add drag event handlers for the handle
  setupResizeHandlers(resizeHandle, navPanel);
  
  // Create toggle button as a separate element
  const toggleButton = document.createElement('button');
  toggleButton.id = 'gpt-navigator-toggle';
  toggleButton.className = 'gpt-navigator-toggle';
  toggleButton.innerHTML = '&raquo;';
  toggleButton.addEventListener('click', () => {
    navPanel.classList.toggle('collapsed');
    toggleButton.innerHTML = navPanel.classList.contains('collapsed') ? '&laquo;' : '&raquo;';
    // Adjust toggle button position when panel state changes
    adjustPanelOnResize();
  });
  
  // Add the panel to the body
  document.body.appendChild(navPanel);
  
  // Add toggle button separately to ensure it's not affected by panel styles
  document.body.appendChild(toggleButton);
  
  // Identify and mark the main content area for style adjustments
  const mainElement = document.querySelector('main#main');
  if (mainElement && mainElement.parentElement) {
    mainElement.parentElement.classList.add('gpt-navigator-main-content-wrapper');
  }
  
  // Set initial width
  userPanelWidth.current = getDefaultPanelWidth();
  navPanel.style.width = `${userPanelWidth.current}px`;
  
  // Adjust initial position
  setTimeout(adjustPanelOnResize, 0);
  
  // Load saved display mode
  loadDisplayMode();
  // Apply initial display mode
  applyDisplayMode();
  
  // Load saved bookmarks
  loadBookmarks();
  
  // Now scan existing content
  scanExistingPrompts();
};

// Set up resize handlers
const setupResizeHandlers = (handle, panel) => {
  let startX, startWidth;
  
  const startResize = (e) => {
    startX = e.clientX;
    startWidth = parseInt(document.defaultView.getComputedStyle(panel).width, 10);
    panel.classList.add('gpt-navigator-resizing');
    
    document.documentElement.addEventListener('mousemove', resize);
    document.documentElement.addEventListener('mouseup', stopResize);
    
    e.preventDefault();
  };
  
  const resize = (e) => {
    // Calculate new width (note direction is right to left)
    const newWidth = startWidth - (e.clientX - startX);
    
    // Limit minimum and maximum width
    const minWidth = 180;
    const maxWidth = window.innerWidth * 0.4; // Maximum 40% of window width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      userPanelWidth.current = newWidth;
      panel.style.width = `${newWidth}px`;
      
      // Adjust toggle button position
      const toggleButton = document.getElementById('gpt-navigator-toggle');
      if (toggleButton && !panel.classList.contains('collapsed')) {
        // Disable transition animation during drag
        toggleButton.style.transition = 'none';
        toggleButton.style.right = `${newWidth}px`;
      }
    }
  };
  
  const stopResize = () => {
    panel.classList.remove('gpt-navigator-resizing');
    document.documentElement.removeEventListener('mousemove', resize);
    document.documentElement.removeEventListener('mouseup', stopResize);
    
    // Restore toggle button transition
    const toggleButton = document.getElementById('gpt-navigator-toggle');
    if (toggleButton) {
      setTimeout(() => {
        toggleButton.style.transition = '';
      }, 0);
    }
    
    // Save user-set width
    localStorage.setItem('gpt-navigator-width', userPanelWidth.current);
  };
  
  handle.addEventListener('mousedown', startResize);
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
        // Check if bookmarked
        const isBookmarked = bookmarkedMessages.some(item => item.index === index);
        
        // Skip if showing only bookmarks and current item is not bookmarked
        if (showingOnlyBookmarks && !isBookmarked) {
          return;
        }
        
        // Create link element with styled index number
        const linkElement = document.createElement('a');
        linkElement.className = 'gpt-navigator-link';
        if (isBookmarked) {
          linkElement.classList.add('bookmarked');
        }
        
        // Create number badge element
        const numberBadge = document.createElement('span');
        numberBadge.className = 'gpt-navigator-number';
        numberBadge.textContent = (index + 1).toString();
        
        // Create text content element - using innerHTML to preserve styling and original order
        const textSpan = document.createElement('span');
        textSpan.className = 'gpt-navigator-text';
        
        // If HTML content is present, handle it properly
        if (userInput.includes('<i>')) {
          // Get pure text for length check (without HTML tags)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = userInput;
          const rawText = tempDiv.textContent || '';
          
          // Truncate if needed, but preserve HTML tags
          if (rawText.length > 60) {
            // More complex truncation that preserves HTML
            const displayText = smartTruncateHTML(userInput, 60);
            textSpan.innerHTML = displayText;
          } else {
            // Use as is if short enough
            textSpan.innerHTML = userInput;
          }
        } else {
          // Simple text truncation for plain text
          const shortText = userInput.length > 60
            ? userInput.substring(0, 57) + '...'
            : userInput;
          textSpan.textContent = shortText;
        }
        
        // Create bookmark icon
        const bookmarkIcon = document.createElement('span');
        bookmarkIcon.className = 'gpt-navigator-bookmark';
        bookmarkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
        bookmarkIcon.title = isBookmarked ? 'Remove bookmark' : 'Bookmark this prompt';
        bookmarkIcon.addEventListener('click', (e) => toggleBookmark(e, index, userInput));
        
        // Add elements to the link
        linkElement.appendChild(numberBadge);
        linkElement.appendChild(textSpan);
        linkElement.appendChild(bookmarkIcon);
        
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

// Helper function to intelligently truncate HTML content while preserving HTML tags
const smartTruncateHTML = (htmlString, maxLength) => {
  // Create a temporary div to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  
  // Get all text nodes in the div
  const textNodes = [];
  const getTextNodes = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node);
    } else {
      node.childNodes.forEach(child => getTextNodes(child));
    }
  };
  getTextNodes(tempDiv);
  
  // Calculate total text length
  let totalLength = 0;
  textNodes.forEach(node => {
    totalLength += node.textContent.length;
  });
  
  // If content is short enough, return it as is
  if (totalLength <= maxLength) {
    return htmlString;
  }
  
  // Track how many characters we can keep
  let remainingChars = maxLength - 3; // Reserve space for ellipsis
  let reachedLimit = false;
  
  // Modify text nodes to fit within the limit
  textNodes.forEach(node => {
    if (reachedLimit) {
      node.textContent = '';
    } else if (node.textContent.length <= remainingChars) {
      remainingChars -= node.textContent.length;
    } else {
      node.textContent = node.textContent.substring(0, remainingChars) + '...';
      reachedLimit = true;
    }
  });
  
  return tempDiv.innerHTML;
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
        // Replace code blocks with marker while maintaining original text order
        userInput = fullText.replace(/```[\s\S]*?```/g, '<i>[..code..]</i>');
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
      
      // Replace each code block with marker while maintaining original text order
      let resultText = directText;
      codeTexts.forEach(codeText => {
        if (codeText && resultText.includes(codeText)) {
          resultText = resultText.replace(codeText, '<i>[..code..]</i>');
        }
      });
      
      // Clean up whitespace
      resultText = resultText.replace(/\s+/g, ' ').trim();
      
      if (resultText) {
        return resultText;
      } else {
        return '<i>[..code..]</i>';
      }
    }
    
    // Strategy 3: Find the text directly in the user element
    // Useful for simple messages without formatting
    let directText = userElement.textContent?.trim() || '';
    
    // Check for code blocks in the direct text content
    if (directText.includes('```')) {
      // Replace code blocks with marker while maintaining original text order
      directText = directText.replace(/```[\s\S]*?```/g, '<i>[..code..]</i>');
      return directText;
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

// Adjust panel position and size when window resizes
const adjustPanelOnResize = () => {
  const navPanel = document.getElementById('gpt-navigator-panel');
  const toggleButton = document.getElementById('gpt-navigator-toggle');
  
  if (!navPanel || !toggleButton) return;
  
  // Use responsive default values only if no custom width set
  if (!userPanelWidth.current) {
    userPanelWidth.current = getDefaultPanelWidth();
    navPanel.style.width = `${userPanelWidth.current}px`;
  }
  
  // Try to read user-set width from local storage
  const savedWidth = localStorage.getItem('gpt-navigator-width');
  if (savedWidth && !navPanel.classList.contains('gpt-navigator-resizing')) {
    userPanelWidth.current = parseInt(savedWidth);
    navPanel.style.width = `${userPanelWidth.current}px`;
  }
  
  // Check if panel is collapsed
  const isCollapsed = navPanel.classList.contains('collapsed');
  
  // Move toggle button position based on panel state
  if (!isCollapsed) {
    toggleButton.style.right = `${userPanelWidth.current}px`;
  } else {
    // Collapsed state position handled by CSS
    toggleButton.style.right = '0';
  }
  
  // Apply display mode adjustments after resize
  applyDisplayMode();
};

// Bookmark related state
let bookmarkedMessages = [];
let showingOnlyBookmarks = false;

// Get current conversation ID from URL
const getConversationId = () => {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
};

// Load bookmarks from storage
const loadBookmarks = () => {
  try {
    const conversationId = getConversationId();
    if (!conversationId) {
      bookmarkedMessages = [];
      scanExistingPrompts(); // Rescan to clear bookmarks if no ID
      return;
    }
    const storageKey = `gptNavigatorBookmarks_${conversationId}`;
    chrome.storage.local.get(storageKey, (data) => {
      if (data[storageKey]) {
        bookmarkedMessages = JSON.parse(data[storageKey]);
      } else {
        bookmarkedMessages = []; // Clear if no bookmarks for this conversation
      }
      // Rescan to apply bookmark state, regardless of whether bookmarks were found
      scanExistingPrompts();
    });
  } catch (error) {
    console.error('[GPT Navigator] Error loading bookmarks:', error);
    // Use localStorage as fallback
    const conversationId = getConversationId();
    if (!conversationId) {
      bookmarkedMessages = [];
      scanExistingPrompts();
      return;
    }
    const storageKey = `gptNavigatorBookmarks_${conversationId}`;
    const savedBookmarks = localStorage.getItem(storageKey);
    if (savedBookmarks) {
      try {
        bookmarkedMessages = JSON.parse(savedBookmarks);
      } catch (e) {
        bookmarkedMessages = [];
      }
    } else {
      bookmarkedMessages = [];
    }
    scanExistingPrompts(); // Ensure UI updates with fallback data
  }
};

// Save bookmarks to storage
const saveBookmarks = () => {
  try {
    const conversationId = getConversationId();
    if (!conversationId) return; // Don't save if no conversation ID

    const storageKey = `gptNavigatorBookmarks_${conversationId}`;
    // Try to use chrome.storage API
    chrome.storage.local.set({ [storageKey]: JSON.stringify(bookmarkedMessages) });
  } catch (error) {
    // If chrome.storage is unavailable, fall back to localStorage
    const conversationId = getConversationId();
    if (!conversationId) return;

    const storageKey = `gptNavigatorBookmarks_${conversationId}`;
    localStorage.setItem(storageKey, JSON.stringify(bookmarkedMessages));
  }
};

// Toggle bookmark filter
const toggleBookmarkFilter = (e) => {
  showingOnlyBookmarks = !showingOnlyBookmarks;
  
  const filterButton = e.currentTarget;
  if (showingOnlyBookmarks) {
    filterButton.classList.add('active');
  } else {
    filterButton.classList.remove('active');
  }
  
  // Rescan to apply filter
  scanExistingPrompts();
};

// Toggle bookmark state
const toggleBookmark = (e, index, messageContent) => {
  e.stopPropagation(); // Prevent click from triggering link navigation
  
  const bookmarkIndex = bookmarkedMessages.findIndex(item => item.index === index);
  const linkElement = e.currentTarget.closest('.gpt-navigator-link');
  
  if (bookmarkIndex === -1) {
    // Add bookmark
    bookmarkedMessages.push({ index, content: messageContent });
    linkElement.classList.add('bookmarked');
  } else {
    // Remove bookmark
    bookmarkedMessages.splice(bookmarkIndex, 1);
    linkElement.classList.remove('bookmarked');
    
    // If currently in "show only bookmarks" mode, hide this item
    if (showingOnlyBookmarks) {
      linkElement.style.display = 'none';
    }
  }
  
  // Save to storage
  saveBookmarks();
};

// Variable to store the current conversation ID
let currentConversationId = null;

// Function to check for conversation changes
const checkForConversationChange = () => {
  const newConversationId = getConversationId();
  if (newConversationId !== currentConversationId) {
    console.log('[GPT Navigator] Conversation changed from', currentConversationId, 'to', newConversationId);
    currentConversationId = newConversationId;
    // Conversation has changed, load new bookmarks
    // scanExistingPrompts() is called by loadBookmarks
    loadBookmarks();
  }
};

// Load display mode from storage
const loadDisplayMode = () => {
  const savedMode = localStorage.getItem('gpt-navigator-display-mode');
  if (savedMode === 'embed' || savedMode === 'float') {
    currentDisplayMode = savedMode;
  } else {
    currentDisplayMode = 'float'; // Default to float if invalid or not set
  }
};

// Save display mode to storage
const saveDisplayMode = () => {
  localStorage.setItem('gpt-navigator-display-mode', currentDisplayMode);
};

// Toggle display mode
const toggleDisplayMode = () => {
  currentDisplayMode = currentDisplayMode === 'float' ? 'embed' : 'float';
  saveDisplayMode();
  applyDisplayMode();
  // Adjust panel on resize might be needed if panel width/content changes based on mode
  adjustPanelOnResize();
};

// Apply display mode changes to the UI
const applyDisplayMode = () => {
  const navPanel = document.getElementById('gpt-navigator-panel');
  const toggleButton = document.getElementById('gpt-navigator-toggle'); // The main toggle for showing/hiding panel
  const displayModeButton = document.querySelector('.gpt-navigator-display-mode');
  const mainContentArea = document.querySelector('.gpt-navigator-main-content-wrapper'); // Target the wrapper

  if (!navPanel || !toggleButton || !displayModeButton) return;

  if (currentDisplayMode === 'embed') {
    navPanel.classList.add('embedded');
    navPanel.classList.remove('floating'); // Ensure floating class is removed
    displayModeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> <span>Embed</span>';
    displayModeButton.title = "Switch to Floating Mode";

    // Panel is embedded, adjust main content
    if (mainContentArea) {
      if (!navPanel.classList.contains('collapsed')) {
        mainContentArea.style.marginRight = `${navPanel.offsetWidth}px`;
      } else {
        mainContentArea.style.marginRight = '0px';
      }
    }
    // For embedded mode, the visibility toggle button might need different positioning logic
    // if panel is collapsed, toggle button should be at the edge of the screen
    if (navPanel.classList.contains('collapsed')) {
        toggleButton.style.right = '0px';
    } else {
        // When embedded and open, the toggle button moves with the panel edge
        toggleButton.style.right = `${userPanelWidth.current}px`;
    }

  } else { // 'float' mode
    navPanel.classList.remove('embedded');
    navPanel.classList.add('floating'); // Add a class for floating specific styles if needed
    displayModeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg> <span>Float</span>';
    displayModeButton.title = "Switch to Embedded Mode";

    // Panel is floating, main content is not affected by panel width
    if (mainContentArea) {
      mainContentArea.style.marginRight = '0px';
    }
    // Floating mode positioning for the visibility toggle
    if (navPanel.classList.contains('collapsed')) {
        toggleButton.style.right = '0px';
    } else {
        toggleButton.style.right = `${userPanelWidth.current}px`;
    }
  }
  // Ensure the main visibility toggle button's text is correct
  toggleButton.innerHTML = navPanel.classList.contains('collapsed') ? '&laquo;' : '&raquo;';
};

// Start observing DOM and listen for URL changes
document.addEventListener('DOMContentLoaded', () => {
  observeDOM();
  // Add a popstate listener for URL changes (e.g., back/forward navigation)
  window.addEventListener('popstate', checkForConversationChange);
  // Initial application of display mode based on saved preference or default
  loadDisplayMode(); // Ensure mode is loaded before first apply
  applyDisplayMode();
});
// The initial observeDOM() call will handle the first load.
// If the DOM is already loaded when this script runs, observeDOM() should still be called.
// Adding a direct call here as a fallback, but DOMContentLoaded should be the primary trigger.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  observeDOM();
} 