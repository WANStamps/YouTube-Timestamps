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
        const content = new TextDecoder().decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));
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
        if(!line || !line.trim() || !line.trim().length) {
            return; // Skip empty lines
        }
        if(line.trim() === '```') {
            return; // Skip code blocks
        }

        // Extract timestamp if present
        const timeMatch = line.match(/(?:^|\s)(?:[^\w\s])?(\d+:\d+(?::\d+)?)(?:[^\w\s])?(?=\s|$)/);
        if (timeMatch) {
            const timestamp = timeMatch[1] || timeMatch[2];
            const seconds = convertTimeToSeconds(timestamp);

            // Set data-seconds attr on div
            div.setAttribute('data-seconds', ''+seconds);

            // Create a clickable span instead of an anchor
            const timeLink = document.createElement('span');
            timeLink.className = "yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color";
            timeLink.style.cursor = "pointer";
            timeLink.textContent = timeMatch[0];

            // Add click handler to seek video
            timeLink.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the div click handler from firing
                seekToTimestamp(seconds);
            });

            // Add click handler to the entire div
            div.addEventListener('click', (e) => {
                const rect = div.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const lineWidth = rect.width;
                const clickPercentage = clickX / lineWidth;

                // Find the next timestamp if it exists
                const timestampLines = document.querySelectorAll('.timestamp-line[data-seconds]');
                const currentIndex = Array.from(timestampLines).indexOf(div);

                if (currentIndex < timestampLines.length - 1) {
                    const nextLine = timestampLines[currentIndex + 1];
                    const currentSeconds = parseInt(div.dataset.seconds);
                    const nextSeconds = parseInt(nextLine.dataset.seconds);

                    // Calculate target time based on click position
                    const totalDuration = nextSeconds - currentSeconds;
                    const targetTime = currentSeconds + (totalDuration * clickPercentage);

                    seekToTimestamp(targetTime);
                } else {
                    // If there's no next timestamp, just seek to this timestamp
                    seekToTimestamp(seconds);
                }
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

    setInterval(updateCurrentTimestamp, 1000);
}

function seekToTimestamp(seconds) {
    // Get the YouTube player
    let video = document.querySelector('video');
    if(!video) {
        console.error("No YouTube player found");
        return;
    }
    video.currentTime = seconds;

    updateCurrentTimestamp();
}

function updateCurrentTimestamp() {
    const video = document.querySelector('video');
    if (!video) {
        console.error("No YouTube player found");
        return;
    }

    const currentTime = video.currentTime;

    // Get all timestamp lines
    const timestampLines = document.querySelectorAll('.timestamp-line[data-seconds]');

    // Remove current-timestamp class and progress bar from any existing elements
    const previousCurrentLine = document.querySelector('.timestamp-line.current-timestamp');
    if (previousCurrentLine) {
        previousCurrentLine.classList.remove('current-timestamp');
        previousCurrentLine.style.background = '';
    }

    // Find the timestamp line that's closest to but not after currentTime
    let currentLine = null;
    let currentIndex = -1;

    for (let i = 0; i < timestampLines.length; i++) {
        const line = timestampLines[i];
        const seconds = parseInt(line.dataset.seconds);
        if (seconds <= currentTime) {
            currentLine = line;
            currentIndex = i;
        } else {
            break;
        }
    }

    // Add current-timestamp class to the found line
    if (currentLine) {
        currentLine.classList.add('current-timestamp');

        // Check if there is a next timestamp
        if (currentIndex < timestampLines.length - 1) {
            const nextLine = timestampLines[currentIndex + 1];
            const currentSeconds = parseInt(currentLine.dataset.seconds);
            const nextSeconds = parseInt(nextLine.dataset.seconds);

            // Calculate progress
            const totalDuration = nextSeconds - currentSeconds;
            const elapsedDuration = currentTime - currentSeconds;
            const progress = Math.min(Math.max(elapsedDuration / totalDuration, 0), 1);

            // Create gradient for progress bar
            const gradientWidth = Math.floor(progress * 100);
            currentLine.style.background = `linear-gradient(to right, #009688 ${gradientWidth}%, rgba(0, 150, 136, 0.3) ${gradientWidth}%)`;
        }
    }
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
