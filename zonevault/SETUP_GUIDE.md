# 🚀 ZoneVault XAMPP Setup Guide

## ✅ **Setup Complete!**

Your ZoneVault project has been successfully set up in XAMPP. Here's what was done:

### **📁 Project Structure**
```
C:\xampp\htdocs\zonevault\
├── zonevault.html          # Main application file
├── script.js              # JavaScript functionality
├── styles.css             # Styling
├── zones-data.json        # Zone and service data
├── sw.js                  # Service worker for offline support
├── manifest.json          # PWA manifest
└── api/                   # Backend API
    ├── login.php          # User authentication
    ├── signup.php         # User registration
    ├── zones.php          # Zone management
    ├── db.php             # Database connection
    └── config.php         # Database configuration
```

### **🌐 Access Your Application**

**Main Application:**
```
http://localhost/zonevault/zonevault.html
```

**API Endpoints:**
```
http://localhost/zonevault/api/login.php
http://localhost/zonevault/api/signup.php
http://localhost/zonevault/api/zones.php
```

### **🗄️ Database Setup**

The database `zonevault` has been created. The application will automatically create the required tables when you first use the signup or login features.

### **🔧 XAMPP Services Required**

Make sure these services are running in XAMPP Control Panel:
- ✅ **Apache** (Web Server)
- ✅ **MySQL** (Database)

### **📱 Features Available**

1. **Emergency Contacts** - Comprehensive helplines and zone-specific contacts
2. **Local Services** - Detailed service directory with ratings and information
3. **Interactive Map** - OpenStreetMap integration with multiple tile providers
4. **Offline Support** - Works without internet connection
5. **User Authentication** - Login/signup system
6. **Admin Panel** - Zone management (for admin users)

### **👤 Default Admin Account**

To create an admin account, sign up with:
```
Email: admin@zonevault.local
```

This will automatically grant admin privileges.

### **🔍 Testing the Setup**

1. **Open your browser** and go to: `http://localhost/zonevault/zonevault.html`
2. **Test the map** - Navigate to the Map section
3. **Test emergency contacts** - Check the Emergency section
4. **Test services** - Browse the Services section
5. **Test offline mode** - Disconnect internet and verify the app still works

### **🛠️ Troubleshooting**

**If the application doesn't load:**
1. Check if Apache is running in XAMPP Control Panel
2. Verify the URL: `http://localhost/zonevault/zonevault.html`
3. Check the browser console for any errors

**If API calls fail:**
1. Check if MySQL is running in XAMPP Control Panel
2. Verify database connection in `api/config.php`
3. Check browser network tab for API errors

**If map doesn't load:**
1. Check internet connection (for tile loading)
2. The app works offline with cached tiles
3. Try different map providers in the Map section

### **📊 Database Tables**

The following tables will be created automatically:
- `users` - User accounts and authentication
- `zones` - Custom zones added by admins

### **🎯 Next Steps**

1. **Start XAMPP Control Panel** if not already running
2. **Open the application** in your browser
3. **Create a user account** using the Sign Up feature
4. **Explore all features** - Emergency, Services, Map, etc.
5. **Test offline functionality** by disconnecting internet

### **📞 Support**

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Verify XAMPP services are running
3. Check the database connection
4. Review the API endpoints in the Network tab

---

## 🎉 **ZoneVault is Ready!**

Your comprehensive zone-specific safety and service directory is now fully operational with offline capabilities, emergency contacts, local services, and interactive mapping.

**Access it now:** `http://localhost/zonevault/zonevault.html`
