# ChatGPT Navigator

A Chrome extension that adds a navigation panel to ChatGPT conversations, making it easy to jump between your prompts.

## Features

- Collapsible navigation panel to the side of ChatGPT
- Automatically detects and lists all user prompts in the conversation
- Click on any prompt to instantly scroll to it
- Visual highlight effect when navigating to a prompt
- Toggle button to hide/show the navigation panel
- Bookmark prompts to quickly access them later
- Filter prompts to show only bookmarked ones


## Installation

### From Chrome Web Store (Coming Soon)
- The extension will be available on the Chrome Web Store in the future.

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the `ChatGptNavigator` folder
5. The extension should now be installed and active

## Usage

1. Go to [chat.openai.com](https://chat.openai.com/)
2. The navigation panel will automatically appear on the right side of the page
3. Each of your prompts will be listed in the panel
4. Click on any prompt to quickly navigate to it
5. Use the toggle button (« / ») to collapse or expand the panel

## How It Works

The extension scans the ChatGPT interface for user prompts and creates a navigation menu with links to each prompt. It uses a MutationObserver to detect when new prompts are added to the conversation and updates the navigation panel accordingly.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 