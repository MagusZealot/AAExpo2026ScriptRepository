let scriptsData = [];

async function loadScriptsData() {
    const response = await fetch('scripts-data.json');
    if (!response.ok) {
        throw new Error(`Unable to load scripts-data.json (${response.status})`);
    }

    scriptsData = await response.json();
}

// DOM Elements
let searchInput;
let scriptsGrid;
let tocList;
let tocToggle;
let tocWrapper;
let beginnerCount;
let intermediateCount;
let expertCount;
let scrollTopButton;
let sidebarHandle;
let sidebarScrim;

function cacheDomElements() {
    searchInput = document.getElementById('searchInput');
    scriptsGrid = document.getElementById('scriptsGrid');
    tocList = document.getElementById('tocList');
    tocToggle = document.getElementById('tocToggle');
    tocWrapper = document.getElementById('tocWrapper');
    beginnerCount = document.getElementById('beginnerCount');
    intermediateCount = document.getElementById('intermediateCount');
    expertCount = document.getElementById('expertCount');
    scrollTopButton = document.getElementById('scrollTopButton');
    sidebarHandle = document.getElementById('sidebarHandle');
    sidebarScrim = document.getElementById('sidebarScrim');
}

// Initialize the page
async function init() {
    cacheDomElements();
    setupSidebarToggle();
    setupMobileSidebar();
    setupScrollTopButton();

    try {
        await loadScriptsData();
        updateStats();
        renderScripts(scriptsData);
        populateTOC();
        setupSearch();
    } catch (error) {
        console.error(error);
        scriptsGrid.innerHTML = `
            <div class="no-results">
                <h3>Scripts could not be loaded</h3>
                <p>Please refresh the page and try again.</p>
            </div>
        `;
    }
}

function updateStats() {
    const stats = {
        Beginner: 0,
        Intermediate: 0,
        Expert: 0
    };

    scriptsData.forEach(script => {
        stats[script.difficulty]++;
    });

    beginnerCount.textContent = stats.Beginner;
    intermediateCount.textContent = stats.Intermediate;
    expertCount.textContent = stats.Expert;
}

// Render scripts grid
function renderScripts(scripts) {
    if (scripts.length === 0) {
        scriptsGrid.innerHTML = `
            <div class="no-results">
                <h3>No scripts found</h3>
                <p>Try adjusting your search terms or filters.</p>
            </div>
        `;
        return;
    }

    scriptsGrid.innerHTML = scripts.map((script, index) => `
        <article class="script-card" id="script-${index}" data-title="${script.title}">
            <div class="card-header">
                <h2 class="card-title">
                    ${script.link ? `<a href="${escapeHtml(script.link)}" target="_blank" rel="noopener noreferrer" class="card-title-link">${escapeHtml(script.title)} </a>` : escapeHtml(script.title)}
                </h2>
                <div class="card-meta">
                    <span class="badge ${script.difficulty.toLowerCase()}">
                        ${script.difficulty}
                    </span>
                    <span class="author">by ${escapeHtml(script.author)}</span>
                </div>
            </div>

            <div class="card-body">
                <div class="divider-wrapper">
                    <img src="divider.png" alt="" class="divider-img">
                </div>
                <p class="description">${formatWithStrong(script.description)}</p>

                <div class="characters-section">
                    <span class="characters-label">Key Characters</span>
                    <div class="characters-list">
                        ${script.keyCharacters.map(char => `
                            <span class="character-tag"><a class="character-tag-link" href="https://wiki.bloodontheclocktower.com/${encodeURIComponent(char.replace(/ /g, '_'))}" target="_blank" rel="noopener noreferrer">${escapeHtml(char)}</a></span>
                        `).join('')}
                    </div>
                </div>

                ${script.specialRules ? `
                <div class="divider-wrapper">
                    <img src="divider.png" alt="" class="divider-img">
                </div>
                <div class="rules-section">
                    <span class="rules-label">Special Rules</span>
                    <div class="rules-callout">
                        ${formatWithStrong(script.specialRules)}
                    </div>
                </div>
                ` : ''}
            </div>
        </article>
    `).join('');
}

// Populate table of contents
function populateTOC() {
    tocList.innerHTML = scriptsData.map((script, index) => `
        <li>
            <a href="#script-${index}" class="toc-link">
                ${escapeHtml(script.title)}
            </a>
        </li>
    `).join('');

    // Add smooth scrolling
    document.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight the card briefly
                targetElement.style.backgroundColor = '#fff9e6';
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                }, 1500);
            }
        });
    });
}

// Setup search functionality
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filtered = filterScripts(searchTerm);
        renderScripts(filtered);
    });
}

// Setup collapsible TOC in the sidebar
function setupSidebarToggle() {
    if (!tocToggle || !tocWrapper) return;

    const sidebar = document.querySelector('.sidebar');

    // Ensure ARIA state is set
    tocToggle.setAttribute('role', 'button');
    tocToggle.setAttribute('aria-expanded', String(!tocToggle.classList.contains('collapsed')));

    tocToggle.addEventListener('click', () => {
        const isCollapsed = tocToggle.classList.toggle('collapsed');
        tocWrapper.classList.toggle('collapsed');
        if (sidebar) sidebar.classList.toggle('collapsed');
        tocToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
}

function setupMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || !sidebarHandle || !sidebarScrim) return;

    const mobileMedia = window.matchMedia('(max-width: 900px)');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartedInDismissArea = false;
    let touchStartedAtEdge = false;

    const setMobileSidebarOpen = (isOpen) => {
        document.body.classList.toggle('mobile-sidebar-open', isOpen);
        sidebarHandle.setAttribute('aria-expanded', String(isOpen));
        sidebarHandle.setAttribute('aria-label', isOpen ? 'Close contents' : 'Open contents');
    };

    const closeMobileSidebar = () => setMobileSidebarOpen(false);
    const openMobileSidebar = () => setMobileSidebarOpen(true);

    sidebarHandle.addEventListener('click', openMobileSidebar);
    sidebarScrim.addEventListener('click', closeMobileSidebar);

    document.addEventListener('click', (event) => {
        const link = event.target.closest ? event.target.closest('.toc-link') : null;
        if (link && mobileMedia.matches) closeMobileSidebar();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mobileMedia.matches) {
            closeMobileSidebar();
        }
    });

    document.addEventListener('touchstart', (event) => {
        if (!mobileMedia.matches || event.touches.length !== 1) return;

        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartedInDismissArea = sidebar.contains(event.target) || sidebarScrim.contains(event.target);
        touchStartedAtEdge = touchStartX <= 28;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        if (!mobileMedia.matches || !touchStartX || event.changedTouches.length !== 1) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const isHorizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;
        const isOpen = document.body.classList.contains('mobile-sidebar-open');

        if (isHorizontalSwipe && !isOpen && touchStartedAtEdge && deltaX > 0) {
            openMobileSidebar();
        }

        if (isHorizontalSwipe && isOpen && touchStartedInDismissArea && deltaX < 0) {
            closeMobileSidebar();
        }

        touchStartX = 0;
        touchStartY = 0;
        touchStartedInDismissArea = false;
        touchStartedAtEdge = false;
    }, { passive: true });

    const handleViewportChange = (event) => {
        if (!event.matches) closeMobileSidebar();
    };

    if (mobileMedia.addEventListener) {
        mobileMedia.addEventListener('change', handleViewportChange);
    } else {
        mobileMedia.addListener(handleViewportChange);
    }
}

function setupScrollTopButton() {
    if (!scrollTopButton) return;

    const updateVisibility = () => {
        scrollTopButton.classList.toggle('visible', window.scrollY > 300);
    };

    scrollTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();
}

const characterSearchAliases = {
    alhadikhia: 'Al-Hadikhia',
    bigwig: 'Big Wig',
    bountyhunter: 'Bounty Hunter',
    cultleader: 'Cult Leader',
    devilsadvocate: "Devil's Advocate",
    eviltwin: 'Evil Twin',
    fanggu: 'Fang Gu',
    flowergirl: 'Flowergirl',
    fortuneteller: 'Fortune Teller',
    godofug: 'God of Ug',
    highpriestess: 'High Priestess',
    lilmonsta: "Lil' Monsta",
    lordoftyphon: 'Lord of Typhon',
    moonchild: 'Moonchild',
    nightwatchman: 'Nightwatchman',
    nodashii: 'No Dashii',
    organgrinder: 'Organ Grinder',
    pithag: 'Pit Hag',
    plaguedoctor: 'Plague Doctor',
    poppygrower: 'Poppy Grower',
    puzzlemaster: 'Puzzlemaster',
    ravenkeeper: 'Ravenkeeper',
    scarletwoman: 'Scarlet Woman',
    snakecharmer: 'Snake Charmer',
    stormcatcher: 'Storm Catcher',
    tealady: 'Tea Lady',
    towncrier: 'Town Crier',
    villageidiot: 'Village Idiot'
};

// Filter scripts based on search term
function filterScripts(searchTerm) {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);
    const terms = normalizedSearchTerm.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return scriptsData;

    return scriptsData.filter(script => {
        const searchableFields = [
            script.title,
            script.author,
            script.difficulty,
            script.description,
            script.specialRules || '',
            ...(script.keyCharacters || [])
        ].map(normalizeSearchText);

        const allCharactersText = script.allCharacters
            ? script.allCharacters
                .flatMap(character => {
                    const characterId = String(character).toLowerCase();
                    return [characterId, characterSearchAliases[characterId] || ''];
                })
                .map(normalizeSearchText)
                .join(' ')
            : '';
        const searchableText = `${searchableFields.join(' ')} ${allCharactersText}`;

        if (terms.length === 1) {
            return searchableText.includes(terms[0]);
        }

        if (searchableText.includes(normalizedSearchTerm)) {
            return true;
        }

        const searchableWords = new Set(searchableText.split(/\s+/).filter(Boolean));
        return terms.every(term => searchableWords.has(term));
    });
}

function normalizeSearchText(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to format text with markdown-style formatting
function formatWithStrong(text) {
    const escaped = escapeHtml(text);
    // Replace **text** with <strong>text</strong> for bold
    let formatted = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Replace __text__ with <u>text</u> for underline
    formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
    // Replace *text* with <em>text</em> for italic (but not if it's part of ** already)
    formatted = formatted.replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em>$1</em>');
    return formatted;
}

// Initialize on page load, or immediately if the script runs after parsing.
if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else if (typeof document !== 'undefined') {
    init();
}

