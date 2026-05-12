FROM php:8.2-apache

WORKDIR /var/www/html

COPY . .

# Install extensions
RUN docker-php-ext-install pdo pdo_mysql

# Disable conflicting MPMs - keep only mpm_prefork
RUN a2dismod mpm_event mpm_worker || true

# Enable modules  
RUN a2enmod rewrite headers mpm_prefork

# Create Apache config for PORT
RUN echo "Listen 0.0.0.0:8080" > /etc/apache2/ports.conf

# Configure default VirtualHost
RUN cat > /etc/apache2/sites-available/000-default.conf <<'EOF'
<VirtualHost *:8080>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} -f
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule ^ - [L]
        RewriteRule ^api/ - [L]
        RewriteRule ^ index.html [L]
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Set permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Create startup script to handle PORT env var
RUN echo '#!/bin/bash\nset -e\necho "Starting Apache on port ${PORT:-8080}"\nsed -i "s/Listen 0.0.0.0:8080/Listen 0.0.0.0:${PORT:-8080}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \*:8080>/<VirtualHost *:${PORT:-8080}>/" /etc/apache2/sites-available/000-default.conf\napache2-foreground' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# PHP Config
RUN echo "display_errors = Off" >> /usr/local/etc/php/conf.d/docker.ini && \
    echo "log_errors = On" >> /usr/local/etc/php/conf.d/docker.ini && \
    echo "error_log = /proc/self/fd/2" >> /usr/local/etc/php/conf.d/docker.ini

CMD ["/usr/local/bin/start.sh"]
