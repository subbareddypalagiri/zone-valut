XAMPP setup (PHP backend)

1) Move the entire project folder under: C:\xampp\htdocs\zonevault
2) Create MySQL schema:
   - Start Apache + MySQL in XAMPP Control Panel
   - Visit http://localhost/phpmyadmin
   - Create database: zonevault (utf8mb4)
3) Update api/config.php if your DB creds differ (default root/no password works on XAMPP).
4) Test endpoints:
   - POST http://localhost/zonevault/api/signup.php {name,email,phone,password,zone}
   - POST http://localhost/zonevault/api/login.php {email,password}
   - GET  http://localhost/zonevault/api/zones.php
   - POST http://localhost/zonevault/api/zones.php with Authorization header set to admin email and body {id,name,icon,description,address,lat,lng,alerts[]}
5) Open the app: http://localhost/zonevault/zonevault.html
6) Service Worker requires HTTP(s); localhost works. Clear caches on updates.

