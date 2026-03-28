/**
 * Custom Telemetry & Interaction Tracking Engine
 * Designed for Data Analyst Portfolio
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. System Config & Session Management ---
    const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbz59r7meperAYKAyGDxdKsLeWiPFTImTfw9YaKtSa9UC3GGgf6cNr5nbAxRjcLdlMuv/exec';
    
    const getSessionId = () => {
        let sid = sessionStorage.getItem('tel_session_id');
        if (!sid) {
            sid = 'SID-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
            sessionStorage.setItem('tel_session_id', sid);
        }
        return sid;
    };

    // --- 2. Device Type Detection ---
    const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return "Desktop";
    };

    // --- 3. NEW: IP Address & Country Fetching & Caching ---
    let cachedIp = sessionStorage.getItem('tel_ip_address') || 'Fetching...';
    let cachedCountry = sessionStorage.getItem('tel_country') || 'Fetching...';

    if (cachedIp === 'Fetching...' || cachedCountry === 'Fetching...') {
        // GeoJS returns both IP and Country in one quick call!
        fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(res => res.json())
            .then(data => {
                cachedIp = data.ip || 'Unknown';
                cachedCountry = data.country || 'Unknown';
                sessionStorage.setItem('tel_ip_address', cachedIp);
                sessionStorage.setItem('tel_country', cachedCountry);
            })
            .catch(() => {
                cachedIp = 'Unavailable';
                cachedCountry = 'Unavailable';
            });
    }

    // --- 4. Core Dispatcher Function ---
    const sendTelemetry = (category, name, action, itemId = '', value = '') => {
        const payload = {
            "Timestamp": new Date().toISOString(),
            "Session_ID": getSessionId(),
            "IP_Address": cachedIp,
            "Device_Type": getDeviceType(),
            "Event_Category": category,
            "Event_Name": name,
            "Action": action,
            "Item_ID": itemId,
            "Value": value,
            "Country": cachedCountry // <-- NEW: Geolocation added here!
        };

        // Uses mode 'no-cors' & text/plain to strictly prevent Google Apps Script preflight (CORS) errors
        fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true, // Ensures data sends even if the user navigates away or closes tab
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Telemetry suppressed:", err));
    };

    // --- 5. Metric 1: Theme Toggle Tracking ---
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            // Slight delay to allow the HTML class to update first
            setTimeout(() => {
                const currentTheme = document.documentElement.classList.contains('dark-mode') ? 'Dark Mode' : 'Light Mode';
                sendTelemetry('UI Interaction', 'Theme Toggle', 'Click', 'Theme State', currentTheme);
            }, 100);
        });
    });

    // --- 6. Metric 2: Homepage CTA Tracking ---
    const homeCta = document.querySelector('#home a[href="#projects"]');
    if (homeCta) {
        homeCta.addEventListener('click', () => {
            sendTelemetry('Conversion', 'Homepage CTA', 'Click', 'View Case Studies Button');
        });
    }

    // --- 7. Metric 3: CV Download Tracking ---
    const cvBtn = document.querySelector('a[download]');
    if (cvBtn) {
        cvBtn.addEventListener('click', () => {
            sendTelemetry('Conversion', 'CV Download', 'Click', 'Resume File', 'Primary Conversion');
        });
    }

    // --- 8. Metric 4: Section Time Tracking ---
    let activeSection = null;
    let sectionEnterTime = Date.now();

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const now = Date.now();
                // Send time spent on the *previous* section as we leave it
                if (activeSection && activeSection !== entry.target.id) {
                    const timeSpent = Math.round((now - sectionEnterTime) / 1000); // in seconds
                    if (timeSpent > 0) {
                        sendTelemetry('Engagement', 'Section Viewing Time', 'Viewed', activeSection, timeSpent.toString());
                    }
                }
                activeSection = entry.target.id;
                sectionEnterTime = now;
            }
        });
    }, { threshold: 0.4 }); // Triggers when 40% of the section is visible

    document.querySelectorAll('section[id]').forEach(sec => sectionObserver.observe(sec));

    // Capture the final section viewed when the user leaves the page
    window.addEventListener('beforeunload', () => {
        if (activeSection) {
            const timeSpent = Math.round((Date.now() - sectionEnterTime) / 1000);
            if (timeSpent > 0) {
                sendTelemetry('Engagement', 'Section Viewing Time', 'Page Exit', activeSection, timeSpent.toString());
            }
        }
    });

    // --- 9. Metric 5: Project Card Interactions ---
    document.querySelectorAll('.project-card').forEach((card, index) => {
        const label = `Card ${index + 1}`; // <--- This strictly creates "Card 1", "Card 2", etc.
        const seeMoreBtn = card.querySelector('.see-more-btn');
        const viewFullBtn = card.querySelector('.project-details a');

        if (seeMoreBtn) seeMoreBtn.addEventListener('click', () => sendTelemetry('Projects', 'Expand Card', 'Click', label));
        if (viewFullBtn) viewFullBtn.addEventListener('click', () => sendTelemetry('Projects', 'View Full Project', 'Click', label));
    });

    // --- 10. Metric 6: Certificate Card Interactions ---
    document.querySelectorAll('.cert-card').forEach((card) => {
        const title = card.querySelector('h3')?.innerText || 'Unknown Certificate';
        const seeMoreBtn = card.querySelector('.see-cert-btn');
        const viewFullBtn = card.querySelector('.cert-details a');

        if (seeMoreBtn) seeMoreBtn.addEventListener('click', () => sendTelemetry('Certifications', 'Expand Card', 'Click', title));
        if (viewFullBtn) viewFullBtn.addEventListener('click', () => sendTelemetry('Certifications', 'Verify Credential', 'Click', title));
    });

    // --- 11. Metric 7: Article Interactions ---
    document.querySelectorAll('.article-card').forEach((card, index) => {
        const label = `Card ${index + 1}`;
        const seeMoreBtn = card.querySelector('.see-gist-btn');
        const viewFullBtn = card.querySelector('.article-details a');

        if (seeMoreBtn) seeMoreBtn.addEventListener('click', () => sendTelemetry('Articles', 'Expand Card', 'Click', label));
        if (viewFullBtn) viewFullBtn.addEventListener('click', () => sendTelemetry('Articles', 'Read Full Story', 'Click', label));
    });

    // --- 12. Metric 8: Social Link Tracking ---
    document.querySelectorAll('#contact a[href*="linkedin.com"], #contact a[href*="facebook.com"]').forEach(link => {
        link.addEventListener('click', (e) => {
            let platform = link.href.includes('linkedin') ? 'LinkedIn' : 'Facebook';
            sendTelemetry('Social', 'Profile Visit', 'Click', platform);
        });
    });

    // --- 13. Metric 9: Contact Form Submission ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', () => {
            // Captured exactly when HTML5 validation passes and submission sequence begins
            sendTelemetry('Conversion', 'Contact Form', 'Submit', 'Contact UI', 'Success');
        });
    }

    // --- 14. Metric 10: Footer Back-to-Top Interaction ---
    const backToTopBtn = document.querySelector('footer button');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            let count = parseInt(sessionStorage.getItem('tel_btt_count') || '0');
            count++;
            sessionStorage.setItem('tel_btt_count', count.toString());
            sendTelemetry('Navigation', 'Back to Top', 'Click', 'Footer UI', count.toString());
        });
    }

});
