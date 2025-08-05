import React from 'react'

const Footer = () => {
    // Email obfuscation - construct email using JavaScript to avoid bot scraping
    const handleEmailClick = () => {
        const user = 'panna'
        const domain = 'berkeley'
        const tld = 'edu'
        const email = `${user}@${domain}.${tld}`
        window.location.href = `mailto:${email}`
    }

    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-text">Contributions welcome!</p>
                <div className="footer-icons">
                    <a
                        href="https://www.linkedin.com/in/panna-felsen/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-icon"
                        title="LinkedIn Profile"
                    >
                        <i className="fab fa-linkedin"></i>
                    </a>
                    <a
                        href="https://github.com/pannaf/crossfit-leaderboard-remix"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-icon"
                        title="GitHub Repository"
                    >
                        <i className="fab fa-github"></i>
                    </a>
                    <button
                        className="footer-icon email-icon"
                        onClick={handleEmailClick}
                        title="Send Email"
                    >
                        <i className="fas fa-envelope"></i>
                    </button>
                </div>
            </div>
        </footer>
    )
}

export default Footer