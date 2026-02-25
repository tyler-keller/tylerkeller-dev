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
   uvicorn main:app --host 0.0.0.0 --port 3008 --reload
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
sudo systemctl enable tylerkeller-api
sudo systemctl start tylerkeller-api
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