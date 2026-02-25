const API_URL = "https://api.tylerkeller.dev";
const LOCAL_STORAGE_KEY = 't4k.dev-secret-key'

// check for stored key on load
document.addEventListener('DOMContentLoaded', () => {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedKey) {
        verifyAndLoad(storedKey);
    }
});

// handle input
const input = document.getElementById('api-key-input');
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyAndLoad(input.value);
    }
});

// verification & switch
async function verifyAndLoad(key) {
    try {
        // hit login endpoint
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'X-Key': key }
        });

        if (response.ok) {
            // success: store key and unlock
            localStorage.setItem(LOCAL_STORAGE_KEY, key);
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';
            
        } else {
            input.value = '';
            input.placeholder = "whoops...";
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    } catch (e) {
        console.error("Connection error", e);
    }
}