const GITHUB_REPO = "WANStamps/YouTube-Timestamps";
const GITHUB_BRANCH = "main";

let timestampsContainer;
let timestampsIcon;
let stickyTimestamps;

async function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
}

async function checkLocalTimestamps(videoId) {
    try {
        const response = await fetch(chrome.runtime.getURL(`timestamps/${videoId}.md`));
        if (response.ok) {
            const content = await response.text();
            return { source: "local", data: parseMarkdownWithFrontmatter(content) };
        }
    } catch (error) {
        console.log("No local timestamps found");
    }
    return null;
}

async function fetchGitHubTimestamps(videoId) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/timestamps/${videoId}.md?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                },
            },
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const content = atob(data.content);
        return { source: "github", data: parseMarkdownWithFrontmatter(content) };
    } catch (error) {
        console.error("Error fetching GitHub timestamps:", error);
        return null;
    }
}

async function getTimestamps(videoId) {
    console.log(`Fetching timestamps for video ${videoId}...`);
    // First check local timestamps
    const localTimestamps = await checkLocalTimestamps(videoId);
    if (localTimestamps) {
        return localTimestamps;
    }

    // If no local timestamps, try GitHub
    return await fetchGitHubTimestamps(videoId);
}

function parseMarkdownWithFrontmatter(content) {
    // Split frontmatter and content
    const matches = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!matches) {
        return { metadata: {}, content: content };
    }

    const [_, frontmatter, markdownContent] = matches;
    if(markdownContent) {
        markdownContent.replaceAll('```', '');
    }
    try {
        const metadata = jsyaml.load(frontmatter);
        return {
            metadata,
            content: markdownContent.trim(),
        };
    } catch (error) {
        console.error("Error parsing frontmatter:", error);
        return { metadata: {}, content: markdownContent.trim() };
    }
}

function createTimestampsUI(result, videoId) {
    console.log(`Creating timestamp UI,`, result, videoId);

    // Add source indicator
    const sourceIndicator = document.createElement("div");
    sourceIndicator.className = "timestamps-source";
    sourceIndicator.textContent = `Source: ${result.source}`;
    stickyTimestamps.appendChild(sourceIndicator);

    // Add header with metadata
    if (result.data.metadata && result.data.metadata.submitters) {
        const header = document.createElement("div");
        header.className = "timestamps-header";

        let headerContent = "Timestamps by:\n";
        result.data.metadata.submitters.forEach(submitter => {
            headerContent += `${submitter.name}`;
            if (submitter.url) {
                headerContent = headerContent.replace(
                    `@${submitter.name}`,
                    `<a href="https://${submitter.url}" target="_blank">@${submitter.name}</a>`,
                );
            }
            if (submitter.comment) {
                headerContent += ` - ${submitter.comment}`;
            }
            headerContent += "\n";
        });

        header.innerHTML = headerContent;
        stickyTimestamps.appendChild(header);
    }

    // Add content
    const content = document.createElement("div");
    content.className = "timestamps-content";

    // Split content into lines and make timestamps clickable
    const lines = result.data.content.split("\n");
    lines.forEach(line => {
        const div = document.createElement("div");
        div.className = "timestamp-line";

        // Extract timestamp if present
        const timeMatch = line.match(/\[(\d+:\d+(?::\d+)?)\]|>\s*(\d+:\d+(?::\d+)?)/);
        if (timeMatch) {
            const timestamp = timeMatch[1] || timeMatch[2];
            const seconds = convertTimeToSeconds(timestamp);

            // Create a clickable span instead of an anchor
            const timeLink = document.createElement('span');
            timeLink.className = "yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color";
            timeLink.style.cursor = "pointer";
            timeLink.textContent = timeMatch[0];

            // Add click handler to seek video
            timeLink.addEventListener('click', () => {
                seekToTimestamp(seconds);
            });

            // Replace the timestamp text with our clickable span
            div.textContent = line.replace(timeMatch[0], '');
            div.insertBefore(timeLink, div.firstChild);
        } else {
            div.textContent = line;
        }

        content.appendChild(div);
    });

    stickyTimestamps.appendChild(content);
}

function seekToTimestamp(seconds) {
    // Get the YouTube player
    let video = document.querySelector('video');
    if(!video) {
        console.error("No YouTube player found");
        return;
    }
    video.currentTime = seconds;
}

function convertTimeToSeconds(timeString) {
    const parts = timeString.trim().split(":").reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
        seconds += parseInt(parts[i]) * Math.pow(60, i);
    }
    return seconds;
}

function showError(message) {
    console.error(message);
    const error = document.createElement("div");
    error.className = "timestamps-error";
    error.textContent = message;
    stickyTimestamps.appendChild(error);
}

function createTimestampsIcon() {
    timestampsContainer = document.createElement('div');
    timestampsContainer.className = 'timestamps-container';

    timestampsIcon = document.createElement('div');
    timestampsIcon.className = 'timestamps-icon loading';
    timestampsIcon.innerHTML = '&#8635;'; // Loading spinner symbol

    stickyTimestamps = document.createElement('div');
    stickyTimestamps.className = 'sticky-timestamps';

    timestampsContainer.appendChild(timestampsIcon);
    timestampsContainer.appendChild(stickyTimestamps);
    document.body.appendChild(timestampsContainer);

    timestampsIcon.addEventListener('click', toggleTimestamps);
}

function toggleTimestamps() {
    stickyTimestamps.classList.toggle('expanded');
}

function updateTimestampsIcon(hasTimestamps) {
    timestampsIcon.classList.remove('loading');
    if (hasTimestamps) {
        timestampsIcon.innerHTML = '&#10003;'; // Checkmark
        stickyTimestamps.classList.add('expanded');
    } else {
        timestampsIcon.innerHTML = '&#33;'; // Exclamation mark
    }
}

function addCollapseButton() {
    const collapseButton = document.createElement('button');
    collapseButton.className = 'collapse-button';
    collapseButton.innerHTML = '&times;'; // × symbol
    collapseButton.addEventListener('click', toggleTimestamps);
    stickyTimestamps.appendChild(collapseButton);
}

async function init() {
    console.log('Initializing YT Timestamps');
    // Remove any existing timestamps
    const existing = document.querySelector(".timestamps-container");
    if (existing) {
        existing.remove();
    }

    createTimestampsIcon();

    const videoId = await getVideoId();
    if (!videoId) {
        updateTimestampsIcon(false);
        showError('No video ID found');
        return;
    }

    console.log(`Found video ID: ${videoId} from URL parameters or current URL. Fetching timestamps...`);

    try {
        const timestamps = await getTimestamps(videoId);
        if (timestamps) {
            updateTimestampsIcon(true);
            createTimestampsUI(timestamps, videoId);
            addCollapseButton();
        } else {
            updateTimestampsIcon(false);
            showError("No timestamps found for this video.");
        }
    } catch (error) {
        updateTimestampsIcon(false);
        showError('Error fetching timestamps: ' + error.message);
    }
}

// Watch for navigation events (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        init();
    }
}).observe(document, { subtree: true, childList: true });

// Initial load
init();