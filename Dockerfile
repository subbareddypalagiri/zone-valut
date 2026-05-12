FROM php:8.2-fpm-alpine AS php

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html
COPY . .

RUN chown -R www-data:www-data /var/www/html

---

FROM nginx:alpine

WORKDIR /var/www/html

# Copy PHP config from php-fpm image
COPY --from=php /var/www/html /var/www/html
COPY --from=php /usr/local/etc/php /usr/local/etc/php
COPY --from=php /usr/local/etc/php-fpm.d /usr/local/etc/php-fpm.d

# Create nginx config for SPA + API routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
upstream php {
    server localhost:9000;
}

server {
    listen 0.0.0.0:8080 default_server;
    server_name _;
    
    root /var/www/html;
    index index.html index.php;
    
    # API routes
    location /api/ {
        try_files $uri $uri/ =404;
        fastcgi_pass php;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - everything else goes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # PHP files in root (for any direct PHP access)
    location ~ \.php$ {
        fastcgi_pass php;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF

# Start both nginx and php-fpm
RUN echo '#!/bin/sh\nphp-fpm -D\nnginx -g "daemon off;"' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]