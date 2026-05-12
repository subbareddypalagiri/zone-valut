FROM php:8.2-apache

# Metadata
LABEL maintainer="ZoneVault"
LABEL description="ZoneVault - Multi-Zone Safety & Services Directory"

# Set working directory
WORKDIR /var/www/html

# Copy application code
COPY . .

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache modules
RUN a2enmod rewrite headers

# Copy Apache configuration
RUN echo "
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
" > /etc/apache2/conf-available/app.conf

RUN a2enconf app

# Configure Apache to use PORT environment variable
RUN echo "Listen \${PORT:-8080}" > /etc/apache2/ports.conf
RUN sed -i "s/<VirtualHost \*:80>/<VirtualHost *:\${PORT:-8080}>/" /etc/apache2/sites-available/000-default.conf

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# PHP configuration
RUN echo "display_errors = Off" >> /usr/local/etc/php/conf.d/docker.ini
RUN echo "log_errors = On" >> /usr/local/etc/php/conf.d/docker.ini
RUN echo "error_log = /proc/self/fd/2" >> /usr/local/etc/php/conf.d/docker.ini

# Expose port (for reference)
EXPOSE ${PORT:-8080}

# Start Apache in foreground
CMD ["apache2-foreground"]
