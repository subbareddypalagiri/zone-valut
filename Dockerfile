FROM php:8.2-fpm-alpine AS php

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html
COPY . .

RUN chown -R www-data:www-data /var/www/html


FROM nginx:alpine

WORKDIR /var/www/html

# Copy PHP files from php-fpm stage
COPY --from=php /var/www/html /var/www/html

# Create nginx config for SPA + API routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
upstream php {
    server 127.0.0.1:9000;
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

# Copy PHP-FPM from first stage to run both services
COPY --from=php /usr/local/sbin/php-fpm /usr/local/sbin/
COPY --from=php /usr/local/etc/php-fpm.conf /usr/local/etc/
COPY --from=php /usr/local/etc/php-fpm.d /usr/local/etc/php-fpm.d/
COPY --from=php /usr/local/lib/php /usr/local/lib/php

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'php-fpm &' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]
