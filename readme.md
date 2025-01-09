# YouTube Timestamps

A Chrome extension that adds community-contributed timestamps to YouTube videos. The timestamps appear alongside the video and allow for quick navigation to specific sections.

## Features

- Shows timestamps from community contributions
- Seamless integration with YouTube's interface
- Quick navigation without page reloads
- Support for both local and GitHub-hosted timestamps
- Contributor attribution in timestamp listings

## Installation


[![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/wan-show-timestamps/)
[![Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white)](https://chromewebstore.google.com/detail/youtube-timestamps/kgabdockbcffcoikcgcgcmoodjppnhfp)

## Manual installation

1. Clone this repository or download the latest release
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Contributing Timestamps

We welcome timestamp contributions for any YouTube video! Here's how to contribute:

1. Create a new markdown file in the `timestamps` directory
2. Name the file `<videoId>.md` (the video ID can be found in the YouTube URL)
3. Use the following format:

```markdown
---
submitters:
  - name: YourUsername
    url: github.com/YourUsername  # Optional
    comment: Added sections 1-10  # Optional
---
[0:00] Introduction
[1:23] First Topic
[4:56] Second Topic
```

### Timestamp Format
- Use either `[MM:SS]` or `[HH:MM:SS]` format
- Each timestamp should be on a new line
- Add a brief description after each timestamp
- Keep descriptions concise and relevant

### Submit Your Contribution
1. Fork this repository
2. Add your timestamp file
3. Create a pull request
4. In the PR description, include:
    - The video title
    - A brief explanation of why these timestamps are helpful
    - Any additional context that might be useful

## Become a Maintainer

We're actively looking for maintainers to help review timestamp contributions and improve the extension. If you're interested:

1. Start by making some timestamp contributions
2. Help review other people's pull requests
3. Engage in discussions
4. Reach out to existing maintainers expressing your interest

Maintainers help with:
- Reviewing timestamp accuracy
- Ensuring consistent formatting
- Improving documentation
- Supporting new contributors
- Suggesting feature improvements

## Development

Want to improve the extension itself? Great! The extension is built with vanilla JavaScript and uses:

- Chrome Extensions API
- YouTube's player API
- GitHub API for timestamp storage

### Local Development
1. Clone the repository
2. Make your changes
3. Load the unpacked extension in Chrome to test
4. Submit a PR with your improvements

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Important links  

- [Reddit thread](https://old.reddit.com/r/LinusTechTips/comments/1hw49rm/wan_stamps_chrome_extension_for_when_the/)
- [WAN Show Chapters doc](https://docs.google.com/document/d/1R8f1IILzJV-xH6LP7Npj5PNgrI8DquxicFjZOxJvQgI/edit?tab=t.0)