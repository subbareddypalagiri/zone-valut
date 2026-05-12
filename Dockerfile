FROM php:8.2-apache

WORKDIR /var/www/html

# Copy files first
COPY . .

# Install extensions
RUN docker-php-ext-install pdo pdo_mysql

# Enable mod_rewrite
RUN a2enmod rewrite

# Set permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Configure Apache for dynamic PORT
RUN echo "Listen 0.0.0.0:\${PORT:-8080}" > /etc/apache2/ports.conf && \
    sed -i 's/:80/:${PORT:-8080}/' /etc/apache2/sites-available/000-default.conf

# PHP Configuration
RUN { \
    echo 'error_log = /proc/self/fd/2'; \
    echo 'display_errors = off'; \
    echo 'log_errors = on'; \
    } > /usr/local/etc/php/conf.d/docker.ini

# Start Apache
CMD ["apache2-foreground"]

