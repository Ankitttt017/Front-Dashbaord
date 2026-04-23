# Deployment Notes

This project has:

- `backend`: Node/Express API on port `5000`
- `frontend`: Vite/React app that should be built to static files
- `nginx`: serves the frontend and proxies `/api` and `/socket.io` to the backend
- `pm2`: keeps the backend running after the terminal is closed

## 1. Build the frontend

Run:

```powershell
cd C:\Users\Admin\Desktop\Dashboard\frontend
npm install
npm run build
```

After build, static files will be in `frontend\dist`.

## 2. Start the backend with PM2

Run from the project root:

```powershell
cd C:\Users\Admin\Desktop\Dashboard
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Useful PM2 commands:

```powershell
pm2 logs dashboard-backend
pm2 restart dashboard-backend
pm2 stop dashboard-backend
pm2 delete dashboard-backend
```

## 3. Configure nginx

Example server block:

```nginx
server {
    listen 80;
    server_name _;

    root C:/Users/Admin/Desktop/Dashboard/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

After editing `nginx.conf`, reload nginx.

## 4. Important note for Windows restart

`pm2 save` stores the current process list, but the built-in `pm2 startup` flow is for Linux/macOS init systems. On Windows, use one of these:

1. Use Windows Task Scheduler to run `pm2 resurrect` at logon/startup.
2. Or use a Windows helper package such as `pm2-windows-startup` / `pm2-windows-service`.

For a simple Task Scheduler action, use:

```powershell
pm2 resurrect
```

## 5. Recommended flow

For development:

```powershell
cd C:\Users\Admin\Desktop\Dashboard\backend
npm run dev
```

```powershell
cd C:\Users\Admin\Desktop\Dashboard\frontend
npm run dev
```

For production:

1. Build the frontend with `npm run build`
2. Serve `frontend\dist` from nginx
3. Run the backend with `pm2 start ecosystem.config.cjs`
4. Save PM2 with `pm2 save`
5. Restore PM2 on Windows startup with Task Scheduler or a Windows PM2 helper
