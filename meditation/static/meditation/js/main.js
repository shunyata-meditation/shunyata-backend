/**
 * Shunyata Meditation API - Main JavaScript
 * Interactive features for the landing page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    initSmoothScroll();
    
    // Initialize animations on scroll
    initScrollAnimations();
    
    // Add parallax effect to orbs
    initParallax();
    
    // Highlight active page in navigation
    highlightActivePage();
});

/**
 * Highlight the active page in navigation
 */
function highlightActivePage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        
        // Exact match or home page special case
        if (linkPath === currentPath || 
            (currentPath === '/' && linkPath === '/') ||
            (currentPath.startsWith(linkPath) && linkPath !== '/' && linkPath.length > 1)) {
            link.classList.add('active');
        }
    });
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize animations when elements come into view
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card, .type-badge').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Parallax effect for background orbs
 */
function initParallax() {
    const orbs = document.querySelectorAll('.orb');
    
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                orbs.forEach((orb, index) => {
                    const speed = 0.1 + (index * 0.05);
                    orb.style.transform = `translateY(${scrollY * speed}px)`;
                });
                
                ticking = false;
            });
            
            ticking = true;
        }
    });
}

/**
 * Copy code to clipboard
 * @param {HTMLElement} element - The code block element
 */
function copyToClipboard(element) {
    const code = element.textContent;
    navigator.clipboard.writeText(code).then(() => {
        // Show feedback
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        setTimeout(() => {
            element.textContent = originalText;
        }, 1500);
    });
}
