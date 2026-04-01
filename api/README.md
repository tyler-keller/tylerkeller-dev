# API Backend

This is a FastAPI backend for tylerkeller.dev zero-input bridge.

## Requirements

- Python 3.12
- Install dependencies: `pip install -r requirements.txt`

## Local Development

1. Activate the virtual environment:
   ```
   source venv/bin/activate
   ```

2. Run the server:
   ```
   uvicorn main:app --reload --port 6969 
   ```

## Production Deployment at api.tylerkeller.dev

### 1. Create Systemd Service

Create `/etc/systemd/system/tylerkeller-api.service`:

```ini
[Unit]
Description=TylerKeller API
After=network.target

[Service]
User=tylerkeller
WorkingDirectory=/var/www/tylerkeller-dev/api
ExecStart=/var/www/tylerkeller-dev/api/venv/bin/uvicorn main:app --host 127.0.0.1 --port 3008
Restart=always
Environment="PATH=/var/www/tylerkeller-dev/api/venv/bin"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl restart tylerkeller-api.service
```

### 2. Nginx Configuration

Add to your nginx config (e.g., `/etc/nginx/sites-available/api.tylerkeller.dev`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.tylerkeller.dev;

    location / {
        proxy_pass http://127.0.0.1:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/api.tylerkeller.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d api.tylerkeller.dev
```

### 4. Verify

The API will be available at `https://api.tylerkeller.dev`.

Test endpoints:
```bash
curl -X GET https://api.tylerkeller.dev/status -H "X-Key: your-secret-key"
```

## Record of Problems

### 04/01 0135

## Troubleshooting & Architectural Quirks

This section documents specific edge cases, limitations, and hard-learned lessons from building the iOS Shortcut to FastAPI pipeline.

### 1. iOS Shortcuts: Files & Dictionaries
- **The Limitation:** iOS Shortcuts notoriously corrupts binary data (images, audio) if you try to pass a file object as a value inside a dictionary variable to another "Helper" shortcut. 
- **The Fix:** Do not use helper/modular shortcuts for media uploads. Keep the `Get contents of URL` action inside the primary trigger shortcut. Set the request body to `Form` and map the file output directly to the form field.

### 2. iOS Shortcuts: JSON Payload Failures
- **The Limitation:** Relying on "magic variables" to extract dictionary values directly inside a JSON request body often fails silently, sending a null payload to the backend.
- **The Fix:** Explicitly use the `Get dictionary value` action for every required key *before* the network request. Pass the resulting explicit text variables into the JSON body or URL parameters.

### 3. FastAPI: Handling Files (422 Errors)
- **The Limitation:** FastAPI cannot parse `multipart/form-data` into a standard Pydantic `BaseModel`. Attempting to do so results in a `422 Unprocessable Entity` error.
- **The Fix:** Install `python-multipart`. In the route definition, explicitly use FastAPI's dependencies for every field: `type: str = Form(...)` and `photo: UploadFile = File(...)`.

### 4. cURL: Testing Form Uploads
- **The Limitation:** Manually setting `-H 'Content-Type: multipart/form-data'` in a cURL command will cause the request to fail. 
- **The Fix:** Let cURL handle the headers. Use the `-F` flag for both text and files (e.g., `-F "type=morning_routine" -F "photo=@/path/to/image.jpg"`). cURL will automatically inject the content type *and* the required randomized boundary string that FastAPI needs to parse the payload. Note the `@` symbol is required for local files.

### 5. Nginx: Silent Upload Failures (413 Errors)
- **The Limitation:** Nginx has a default upload limit of 1MB. Modern smartphone photos (3MB-10MB) will hit the reverse proxy and immediately return a `413 Payload Too Large` error. Because Nginx kills the connection, the request will never show up in the FastAPI logs.
- **The Fix:** Add `client_max_body_size 20M;` (or larger, depending on ProRAW usage) to the `server` block in your Nginx configuration (`/etc/nginx/sites-available/api.tylerkeller.dev`).

### 6. Audio Journals: Size Bottlenecks
- **The Limitation:** The Groq Whisper API has a strict 25MB file size limit per request. Furthermore, Nginx must be configured to allow files of that size.
- **The Fix:** Ensure the iOS Voice Memos app is explicitly set to "Compressed" audio quality (not "Lossless"). A 20-minute compressed memo is ~10MB, which safely clears both the Nginx proxy limit and the Whisper API limit in a single request, avoiding the need for complex audio-chunking logic on the backend.

### 7. Database Architecture: SQLite & Integer Keys
- **The Logic:** For a single-user, zero-input tracking system, SQLite is optimal. There is no need for PostgreSQL overhead. Furthermore, stick to auto-incrementing integer IDs rather than UUIDs. UUIDs solve distributed syncing and public scraping vulnerabilities—neither of which apply to a private API secured by a hardcoded header key. Integers keep the database small and make manual querying significantly easier.