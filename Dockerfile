FROM php:8.2-apache

# Cleanly disable conflicting MPMs and enable the correct one for PHP
RUN a2dismod mpm_event mpm_worker || true \
    && a2enmod mpm_prefork \
    && a2enmod rewrite headers

# Prevent annoying "ServerName" warnings in logs
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Install extensions for your database
RUN docker-php-ext-install pdo pdo_mysql

# Copy all project files into the container
COPY . .

# Create Apache config for the dynamic PORT
RUN echo "Listen 0.0.0.0:8080" > /etc/apache2/ports.conf

# Configure default VirtualHost with CORRECT rewrite rules (!-f, !-d)
RUN cat > /etc/apache2/sites-available/000-default.conf <<'EOF'
<VirtualHost *:8080>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        # Route to index.html ONLY if the file/dir doesn't exist (SPA routing)
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api/
        RewriteRule ^ index.html [L]
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Set proper permissions so Apache can read the files
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Create startup script to handle Railway's dynamic PORT env var
RUN echo '#!/bin/bash\nset -e\necho "Starting Apache on port ${PORT:-8080}"\nsed -i "s/Listen 0.0.0.0:8080/Listen 0.0.0.0:${PORT:-8080}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \*:8080>/<VirtualHost *:${PORT:-8080}>/" /etc/apache2/sites-available/000-default.conf\napache2-foreground' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# PHP Config (Logs errors instead of showing them to users)
RUN echo "display_errors = Off" >> /usr/local/etc/php/conf.d/docker.ini && \
    echo "log_errors = On" >> /usr/local/etc/php/conf.d/docker.ini && \
    echo "error_log = /proc/self/fd/2" >> /usr/local/etc/php/conf.d/docker.ini

CMD ["/usr/local/bin/start.sh"]