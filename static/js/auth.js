/**
 * Auth Management for Gita Daily
 * Handles Firebase authentication and user session
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Send logout request to API
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to home page
                    window.location.href = '/';
                } else {
                    console.error('Logout failed:', data.error);
                }
            })
            .catch(error => {
                console.error('Error logging out:', error);
            });
        });
    }
});
