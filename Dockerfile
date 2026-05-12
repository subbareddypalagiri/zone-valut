FROM php:8.2-apache

# Enable Apache mod_rewrite for .htaccess support
RUN a2enmod rewrite

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html

# Set Apache to listen on PORT environment variable
RUN sed -i 's/Listen 80/Listen ${PORT:-8080}/' /etc/apache2/ports.conf
RUN sed -i 's/:80/:${PORT:-8080}/' /etc/apache2/sites-available/000-default.conf

# Enable PHP error logging
RUN echo "error_log = /proc/self/fd/2" >> /usr/local/etc/php/conf.d/docker-php-log-errors.ini
RUN echo "display_errors = off" >> /usr/local/etc/php/conf.d/docker-php-log-errors.ini

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/ || exit 1

# Start Apache
CMD ["apache2-foreground"]
