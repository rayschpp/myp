/**
 * Make an API call to the server to get the IP address
 */
function apiCall() {
    // noinspection JSUnresolvedReference <-- for __API_KEY__
    fetch('/api/ip', {
        headers: {'X-API-Key': window.__API_KEY__}
    })
        .then(response => response.text())
        .then(html => {
            const p = document.getElementById('ip-display');
            p.innerHTML = html;
            const chars = p.getElementsByTagName('i');
            if (chars.length > 0) addEffect(chars, 0);
        })
        .catch(error => console.error('Error:', error));
}

/**
 * Add animation effect to each character
 * @param chars HTML elements the effect will be applied to
 * @param counter Index of the current character
 */
function addEffect(chars, counter) {
    setTimeout(function () {
            if (counter < chars.length) {
                chars[counter].className = 'fly-in-out';
                addEffect(chars, counter + 1);
            }
        },
        // Delay between each character animation
        100);
}

window.onload = apiCall;
