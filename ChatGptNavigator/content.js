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
  
  // Add window resize handler to adjust panel layout if needed
  window.addEventListener('resize', adjustPanelOnResize);
};

// 存储面板宽度的变量
let userPanelWidth = {
  default: 280,
  medium: 240,
  small: 220,
  current: null
};

// 根据屏幕尺寸获取默认宽度
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
  navHeader.innerHTML = '<h3>Prompt Navigator</h3>';
  navPanel.appendChild(navHeader);
  
  // Create the links container
  const navLinks = document.createElement('div');
  navLinks.className = 'gpt-navigator-links';
  navLinks.id = 'gpt-navigator-links';
  navPanel.appendChild(navLinks);
  
  // 添加拖动手柄
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'gpt-navigator-resize-handle';
  navPanel.appendChild(resizeHandle);
  
  // 为手柄添加拖动事件
  setupResizeHandlers(resizeHandle, navPanel);
  
  // Create toggle button as a separate element
  const toggleButton = document.createElement('button');
  toggleButton.id = 'gpt-navigator-toggle';
  toggleButton.className = 'gpt-navigator-toggle';
  toggleButton.innerHTML = '&laquo;';
  toggleButton.addEventListener('click', () => {
    navPanel.classList.toggle('collapsed');
    toggleButton.innerHTML = navPanel.classList.contains('collapsed') ? '&raquo;' : '&laquo;';
    // Adjust toggle button position when panel state changes
    adjustPanelOnResize();
  });
  
  // Add the panel to the body
  document.body.appendChild(navPanel);
  
  // Add toggle button separately to ensure it's not affected by panel styles
  document.body.appendChild(toggleButton);
  
  // 设置初始宽度
  userPanelWidth.current = getDefaultPanelWidth();
  navPanel.style.width = `${userPanelWidth.current}px`;
  
  // Adjust initial position
  setTimeout(adjustPanelOnResize, 0);
  
  // Now scan existing content
  scanExistingPrompts();
};

// 设置拖动调整大小的事件处理
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
    // 计算新宽度 (注意方向是从右到左)
    const newWidth = startWidth - (e.clientX - startX);
    
    // 限制最小和最大宽度
    const minWidth = 180;
    const maxWidth = window.innerWidth * 0.4; // 最大为窗口宽度的40%
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      userPanelWidth.current = newWidth;
      panel.style.width = `${newWidth}px`;
      
      // 调整toggle按钮位置
      const toggleButton = document.getElementById('gpt-navigator-toggle');
      if (toggleButton && !panel.classList.contains('collapsed')) {
        // 在拖动过程中禁用过渡动画
        toggleButton.style.transition = 'none';
        toggleButton.style.right = `${newWidth}px`;
      }
    }
  };
  
  const stopResize = () => {
    panel.classList.remove('gpt-navigator-resizing');
    document.documentElement.removeEventListener('mousemove', resize);
    document.documentElement.removeEventListener('mouseup', stopResize);
    
    // 恢复toggle按钮的过渡动画
    const toggleButton = document.getElementById('gpt-navigator-toggle');
    if (toggleButton) {
      setTimeout(() => {
        toggleButton.style.transition = '';
      }, 0);
    }
    
    // 保存用户设置的宽度
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
        // Create link element with styled index number
        const linkElement = document.createElement('a');
        linkElement.className = 'gpt-navigator-link';
        
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
  
  // 如果用户没有设置自定义宽度，才使用响应式默认值
  if (!userPanelWidth.current) {
    userPanelWidth.current = getDefaultPanelWidth();
    navPanel.style.width = `${userPanelWidth.current}px`;
  }
  
  // 尝试从本地存储中读取用户设置的宽度
  const savedWidth = localStorage.getItem('gpt-navigator-width');
  if (savedWidth && !navPanel.classList.contains('gpt-navigator-resizing')) {
    userPanelWidth.current = parseInt(savedWidth);
    navPanel.style.width = `${userPanelWidth.current}px`;
  }
  
  // Check if panel is collapsed
  const isCollapsed = navPanel.classList.contains('collapsed');
  
  // 移除直接设置right样式，改用CSS类控制toggle按钮位置
  // 这样可以利用CSS transition实现动画效果
  if (!isCollapsed) {
    toggleButton.style.right = `${userPanelWidth.current}px`;
  } else {
    // 折叠状态下的位置由CSS类控制
    toggleButton.style.right = '0';
  }
};

// Start observing DOM
document.addEventListener('DOMContentLoaded', observeDOM);
// Also run immediately in case the DOM is already loaded
observeDOM(); 