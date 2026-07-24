/* ==========================================================================
   Task C: Part 1 - XML Integration and Filtering Systems
   ========================================================================== */

let globalMoviesCollection = [];

// Automated initialization routine upon execution
document.addEventListener("DOMContentLoaded", () => {
    // Only fetch XML file data if user is presently browsing the index catalog interface
    if (document.getElementById("catalog-target")) {
        loadCatalogFromXML();
    }

    // Only configure form interception rules if user is browsing the feedback page
    if (document.getElementById("reviewForm")) {
        configureFormValidation();
    }

    // Mobile hamburger menu for smaller screens
    configureMobileNavigation();
});

/**
 * Enables the phone hamburger menu while keeping desktop navigation unchanged
 */
function configureMobileNavigation() {
    const menuToggle = document.getElementById("menu-toggle");
    const siteNav = document.getElementById("site-nav");
    const hiddenLabel = menuToggle ? menuToggle.querySelector(".visually-hidden") : null;

    if (!menuToggle || !siteNav) {
        return;
    }

    menuToggle.addEventListener("click", () => {
        const willOpen = !siteNav.classList.contains("is-open");
        siteNav.classList.toggle("is-open", willOpen);
        menuToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        if (hiddenLabel) {
            hiddenLabel.textContent = willOpen ? "Close menu" : "Open menu";
        }
    });
}

/**
 * Asynchronously extracts data structures from target XML storage files
 */
function loadCatalogFromXML() {
    const catalogTarget = document.getElementById("catalog-target");
    catalogTarget.innerHTML = `<p class="catalog-status" role="status">Loading movies...</p>`;

    fetch('movies.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error("Network layer down. Failed to acquire source data structure.");
            }
            return response.text();
        })
        .then(strData => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(strData, "text/xml");
            const movieNodes = xmlDoc.getElementsByTagName("movie");
            
            globalMoviesCollection = []; // Clear array cache

            for (let i = 0; i < movieNodes.length; i++) {
                const title = movieNodes[i].getElementsByTagName("title")[0].textContent;
                const genre = movieNodes[i].getElementsByTagName("genre")[0].textContent;
                const year = movieNodes[i].getElementsByTagName("year")[0].textContent;
                const rating = movieNodes[i].getElementsByTagName("rating")[0].textContent;
                const posterNode = movieNodes[i].getElementsByTagName("poster")[0];
                const altNode = movieNodes[i].getElementsByTagName("alt")[0];
                const poster = posterNode ? posterNode.textContent : "";
                const alt = altNode ? altNode.textContent : ("Movie poster for " + title);
                
                globalMoviesCollection.push({ title, genre, year, rating, poster, alt });
            }
            
            // Build the initial UI display card system
            renderGridOutput(globalMoviesCollection);

            // Warm the cache for the first posters so they appear sooner
            globalMoviesCollection.slice(0, 4).forEach((item) => {
                if (!item.poster) {
                    return;
                }
                const pre = new Image();
                pre.src = item.poster.replace(/\.jpg$/i, ".webp");
            });
        })
        .catch(err => {
            console.error("XML Stream reading error occurred:", err);
            catalogTarget.innerHTML = 
                `<p class="catalog-status error">Sorry — we could not load the movie catalogue. Please refresh and try again.</p>`;
        });
}

/**
 * Re-maps grid template strings into target catalog container zones
 */
function renderGridOutput(moviesArray) {
    const outputTarget = document.getElementById("catalog-target");
    
    if (moviesArray.length === 0) {
        outputTarget.innerHTML = `<p class="catalog-status">No movies match this genre. Try another filter.</p>`;
        return;
    }

    let compiledCardsHTML = "";
    moviesArray.forEach((item, index) => {
        const eagerLoad = index < 4 ? "eager" : "lazy";
        const fetchPriority = index < 2 ? "high" : "auto";
        const posterHTML = item.poster
            ? `<picture>
                    <source srcset="${escapeHTML(item.poster.replace(/\.jpg$/i, ".webp"))}" type="image/webp">
                    <img class="movie-poster" src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.alt)}" width="360" height="540" loading="${eagerLoad}" decoding="async" fetchpriority="${fetchPriority}">
               </picture>`
            : `<div class="movie-poster movie-poster-fallback is-visible" aria-hidden="true"></div>`;

        compiledCardsHTML += `
            <article class="movie-card">
                <div class="poster-frame">
                    ${posterHTML}
                </div>
                <div class="movie-card-body">
                    <span class="tag-genre">${escapeHTML(item.genre)}</span>
                    <h3>${escapeHTML(item.title)}</h3>
                    <div class="meta-row">
                        <span>Year: <strong>${escapeHTML(item.year)}</strong></span>
                        <span class="rating-display">★ ${escapeHTML(item.rating)}</span>
                    </div>
                </div>
            </article>
        `;
    });
    
    outputTarget.innerHTML = compiledCardsHTML;
    enhancePosterLoading(outputTarget);
}

/**
 * Fades posters in when ready and stops skeleton shimmer for faster perceived load
 */
function enhancePosterLoading(container) {
    const posters = container.querySelectorAll(".movie-poster");
    posters.forEach((img) => {
        const frame = img.closest(".poster-frame");
        const reveal = () => {
            img.classList.add("is-visible");
            if (frame) {
                frame.classList.add("is-loaded");
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            reveal();
        } else {
            img.addEventListener("load", reveal, { once: true });
            img.addEventListener("error", reveal, { once: true });
        }
    });
}

/**
 * Handles Category Selection Routing (Works for more than 2 distinct inputs)
 */
function filterGenre(chosenGenre, activeBtnElement) {
    // Standardize filter tracking highlight state positions
    const siblings = activeBtnElement.parentNode.getElementsByClassName("btn-nav");
    for (let btn of siblings) {
        btn.classList.remove("active");
    }
    activeBtnElement.classList.add("active");

    if (chosenGenre === "All") {
        renderGridOutput(globalMoviesCollection);
    } else {
        const filteredSet = globalMoviesCollection.filter(m => m.genre.toLowerCase() === chosenGenre.toLowerCase());
        renderGridOutput(filteredSet);
    }
}

/* ==========================================================================
   Task C: Part 2 - Custom Evaluation Form Validation Subroutines
   ========================================================================== */

function configureFormValidation() {
    const feedbackForm = document.getElementById("reviewForm");
    const feedbackLogger = document.getElementById("feedback-log");
    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("emailAddr");
    const movieSelect = document.getElementById("movieSelect");
    const regexEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /**
     * Live field checks on blur / change for faster feedback (still no HTML5 validation)
     */
    function markFieldState(inputElement, isValid) {
        if (!inputElement) {
            return;
        }
        inputElement.classList.toggle("input-invalid", !isValid);
    }

    function validateFullNameField(showEmptyAsError) {
        const value = fullNameInput.value.trim();
        const isValid = value.length >= 3;
        if (!showEmptyAsError && value === "") {
            markFieldState(fullNameInput, true);
            return true;
        }
        markFieldState(fullNameInput, isValid);
        return isValid;
    }

    function validateEmailField(showEmptyAsError) {
        const value = emailInput.value.trim();
        const isValid = value !== "" && regexEmailPattern.test(value);
        if (!showEmptyAsError && value === "") {
            markFieldState(emailInput, true);
            return true;
        }
        markFieldState(emailInput, isValid);
        return isValid;
    }

    function validateMovieField(showEmptyAsError) {
        const value = movieSelect.value;
        const isValid = value !== "";
        if (!showEmptyAsError && value === "") {
            markFieldState(movieSelect, true);
            return true;
        }
        markFieldState(movieSelect, isValid);
        return isValid;
    }

    fullNameInput.addEventListener("blur", () => validateFullNameField(true));
    emailInput.addEventListener("blur", () => validateEmailField(true));
    movieSelect.addEventListener("change", () => validateMovieField(true));
    movieSelect.addEventListener("blur", () => validateMovieField(true));

    fullNameInput.addEventListener("input", () => {
        if (fullNameInput.classList.contains("input-invalid")) {
            validateFullNameField(true);
        }
    });
    emailInput.addEventListener("input", () => {
        if (emailInput.classList.contains("input-invalid")) {
            validateEmailField(true);
        }
    });

    feedbackForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const fullNameVal = fullNameInput.value.trim();
        const emailAddrVal = emailInput.value.trim();
        const movieSelectVal = movieSelect.value;

        let detectedErrorsArray = [];

        if (!validateFullNameField(true)) {
            detectedErrorsArray.push("Full name is required and must be at least 3 characters.");
        }

        if (emailAddrVal === "") {
            markFieldState(emailInput, false);
            detectedErrorsArray.push("Email address is required.");
        } else if (!regexEmailPattern.test(emailAddrVal)) {
            markFieldState(emailInput, false);
            detectedErrorsArray.push("Please enter a valid email address (for example name@example.com).");
        } else {
            markFieldState(emailInput, true);
        }

        if (!validateMovieField(true)) {
            detectedErrorsArray.push("Please select a movie from the list.");
        }

        feedbackLogger.className = "feedback-box";

        if (detectedErrorsArray.length > 0) {
            feedbackLogger.classList.add("error");

            let alertOutputHTML = `<strong>Please fix the following (${detectedErrorsArray.length}):</strong><ul style="margin-top:0.5rem; padding-left:1.25rem;">`;
            detectedErrorsArray.forEach(msg => {
                alertOutputHTML += `<li>${msg}</li>`;
            });
            alertOutputHTML += "</ul>";

            feedbackLogger.innerHTML = alertOutputHTML;
            feedbackLogger.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        feedbackLogger.classList.add("success");
        feedbackLogger.innerHTML = `<strong>Review submitted!</strong> Thank you for your feedback on "${escapeHTML(movieSelectVal)}". Your details were checked with JavaScript (not HTML5 validation).`;

        feedbackForm.reset();
        markFieldState(fullNameInput, true);
        markFieldState(emailInput, true);
        markFieldState(movieSelect, true);
        feedbackLogger.scrollIntoView({ behavior: 'smooth' });
    });
}

/**
 * XSS prevention utility to protect output streams inside dynamic templates
 */
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}