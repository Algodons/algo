// Counter demo functionality
let count = 0;

function incrementCounter() {
    count++;
    updateCounter();
    
    // Add animation
    const countElement = document.getElementById('count');
    countElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        countElement.style.transform = 'scale(1)';
    }, 200);
}

function resetCounter() {
    count = 0;
    updateCounter();
}

function updateCounter() {
    document.getElementById('count').textContent = count;
}

// Add some interactivity on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Cloud IDE Sample Workspace Loaded!');
    console.log('Try editing this file and see changes in real-time!');
    
    // Smooth scroll for any future internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add transition to counter display
    const countElement = document.getElementById('count');
    if (countElement) {
        countElement.style.transition = 'transform 0.2s ease';
    }
});

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { incrementCounter, resetCounter };
}
