// ZoneVault - Main Application Script
// Handles SPA navigation, data loading, filtering, and dark mode

// Global variables
let appData = null;
const ALLOWED_ZONE_IDS = [];
const ADMIN_EMAILS = ['admin@zonevault.local'];
const ADMIN_PASSWORD = 'admin123'; // Default admin password
let leafletMap = null;
let baseLayers = {};
let currentBase = null;
let zoneMarkers = [];
let serviceLayer = null;
let currentPage = 'home';
let selectedZoneId = '';
let isAuthenticated = false;
// Build API base relative to current site root (avoids CORS and path mismatches)
const API_BASE = './api';

// Default ratings by category (used when a service has no rating)
const CATEGORY_DEFAULT_RATINGS = {
  clinic: 4.5,
  pharmacy: 4.3,
  electrician: 4.0,
  grocery: 4.1,
  hotel: 4.2,
  food: 4.2,
  tailor: 4.0,
  shopping: 4.1,
  tourist: 4.3
};

// Utility functions
function byId(id) { 
    return document.getElementById(id); 
}

// Render map page (ensure map initializes when page becomes visible)
function renderMapPage() {
    const mapEl = byId('map');
    if (!mapEl) return;
    // If map already created, just fix sizing after the container becomes visible
    if (leafletMap) {
        setTimeout(() => {
            try { leafletMap.invalidateSize(); } catch {}
        }, 0);
        return;
    }
    // Wait for data if not yet loaded, then initialize
    if (!appData || !appData.zones) {
        setTimeout(renderMapPage, 200);
        return;
    }
    initMap();
}

// Render User Dashboard
function renderUserDashboard() {
    const overview = byId('userDashOverview');
    const alertsEl = byId('userDashAlerts');
    const svcEl = byId('userDashServices');
    const ecEl = byId('userDashContacts');
    if (!appData || !appData.zones) return;
    const zone = selectedZoneId ? appData.zones.find(z => z.id === selectedZoneId) : appData.zones[0];
    if (!zone) return;
    const servicesCount = Array.isArray(zone.services) ? zone.services.length : 0;
    const emergencyCount = Array.isArray(zone.emergencyContacts) ? zone.emergencyContacts.length : 0;
    if (overview) {
        overview.innerHTML = `
            <div class="zone-grid">
                <div class="zone-card">
                    <div class="zone-name">${zone.icon || '📍'} ${zone.name}</div>
                    <div class="zone-description">${zone.address || ''}</div>
                    <div class="zone-stats"><span>${servicesCount} Services</span><span>${emergencyCount} Emergency Contacts</span></div>
                    <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <button class="btn" onclick="showPage('services')">View Services</button>
                        <button class="btn" onclick="showPage('emergency')">Emergency Contacts</button>
                        <button class="btn" onclick="showPage('map')">Open Map</button>
                        <button class="btn" onclick="showPage('alerts')">View Alerts</button>
                    </div>
                </div>
            </div>`;
    }
    if (alertsEl) {
        const items = (zone.alerts || []).slice(0,3).map(a => `<li>${a}</li>`).join('') || '<div class="error">No alerts</div>';
        alertsEl.innerHTML = `<ul class="list">${items}</ul>`;
    }
    if (svcEl) {
        const top = (zone.services || []).slice(0,6);
        svcEl.innerHTML = top.map(s => `
            <div class="service-card" data-category="${s.category || ''}">
                <div class="service-name">${s.name || ''} ${s.verified ? '<span class="verified-badge"><i class=\"fas fa-check\"></i> Verified</span>' : ''}</div>
                <div class="service-category">${(s.category || '').toUpperCase()}</div>
                ${s.number ? `<a href="tel:${s.number}" class="contact-number">${s.number}</a>` : ''}
                <div class="contact-description">${s.description || ''}</div>
            </div>
        `).join('');
    }
    if (ecEl) {
        const topc = (zone.emergencyContacts || []).slice(0,5);
        ecEl.innerHTML = topc.map(c => `
            <div class="emergency-card ${c.type || ''}">
                <div class="contact-name">${c.icon || ''} ${c.name || ''}</div>
                ${c.number ? `<a href="tel:${c.number}" class="contact-number">${c.number}</a>` : ''}
                <div class="contact-description">${c.description || ''}</div>
            </div>
        `).join('');
    }
}

// Render Admin Dashboard
function renderAdminDashboard() {
    const kpis = byId('adminKpis');
    const ql = byId('adminQuickLinks');
    const recent = byId('adminRecent');
    const zones = appData?.zones || [];
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    const totalServices = zones.reduce((sum,z)=> sum + (Array.isArray(z.services)? z.services.length : 0), 0);
    const newMsgs = messages.filter(m => m.status !== 'responded').length;
    if (kpis) {
        kpis.innerHTML = `
            <div class="zone-card"><div class="zone-name">Zones</div><div class="zone-description">${zones.length} total</div></div>
            <div class="zone-card"><div class="zone-name">Custom Zones</div><div class="zone-description">${customZones.length}</div></div>
            <div class="zone-card"><div class="zone-name">Services</div><div class="zone-description">${totalServices}</div></div>
            <div class="zone-card"><div class="zone-name">New Messages</div><div class="zone-description">${newMsgs}</div></div>
        `;
    }
    if (ql) {
        ql.innerHTML = `
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button class="btn" onclick="showPage('admin'); showAdminTab('add')">Add Zone</button>
                <button class="btn" onclick="showPage('admin'); showAdminTab('service')">Add Service to Zone</button>
                <button class="btn" onclick="showPage('admin'); showAdminTab('newzonecs')">New Zone Contacts/Services</button>
                <button class="btn" onclick="showPage('admin'); showAdminTab('messages')">User Messages</button>
            </div>
        `;
    }
    if (recent) {
        const recentZones = customZones.slice(-5).reverse().map(z => `<li>${z.name} (${z.id})</li>`).join('') || '<li>No recent custom zones</li>';
        const recentMsgs = messages.slice(-5).reverse().map(m => `<li>${new Date(m.timestamp).toLocaleString()} - ${m.subject} (${m.status})</li>`).join('') || '<li>No recent messages</li>';
        recent.innerHTML = `
            <div class="grid-2" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                <div class="zone-card"><div class="zone-name">Recent Zones</div><ul class="list">${recentZones}</ul></div>
                <div class="zone-card"><div class="zone-name">Recent Messages</div><ul class="list">${recentMsgs}</ul></div>
            </div>
        `;
    }
}

function updateOfflineIndicator(isOffline) {
    const indicator = byId('offlineIndicator');
    if (indicator) {
        indicator.style.display = isOffline ? 'block' : 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#fed7d7' : type === 'success' ? '#c6f6d5' : '#bee3f8'};
        color: ${type === 'error' ? '#742a2a' : type === 'success' ? '#22543d' : '#2c5282'};
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Data loading and management
async function loadData() {
    try {
        console.log('🔄 Loading zone data...');
        
        // Check if we're offline and use cached data
        if (!navigator.onLine) {
            console.log('📱 Offline mode detected, using cached data...');
            const cachedData = localStorage.getItem('cachedZoneData');
            if (cachedData) {
                appData = JSON.parse(cachedData);
                console.log('✅ Using cached zone data');
                return appData;
            }
        }
        
        const response = await fetch(`zones-data.json?v=${Date.now()}`, { 
            cache: 'no-store' 
        });
    
    // Build services layer (initially hidden; toggled via UI)
    buildServicesLayer();

        if (!response.ok) {
            console.error('❌ Response not OK:', response.status, response.statusText);
            throw new Error(`Failed to load zone data: ${response.status} ${response.statusText}`);
        }
        appData = await response.json();
        
        // Cache the data for offline use
        localStorage.setItem('cachedZoneData', JSON.stringify(appData));
        
        // merge in any locally added zones
        const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
        if (Array.isArray(appData.zones)) {
            let merged = [...appData.zones];
            if (Array.isArray(customZones) && customZones.length) {
                customZones.forEach(cz => {
                    const idx = merged.findIndex(z => z.id === cz.id);
                    if (idx >= 0) merged[idx] = cz; else merged.push(cz);
                });
            }
            appData.zones = merged.filter(z => ALLOWED_ZONE_IDS.includes(z.id) || !ALLOWED_ZONE_IDS.length);
        }
        // Ensure all services have rating for search/filtering (default 4.0)
        normalizeServiceRatings(4.0);
        // Persist normalized ratings back to customZones
        persistNormalizedCustomZonesRatings(4.0);
        console.log('✅ Zone data loaded successfully:', appData);
        return appData;
    } catch (error) {
        console.error('❌ Error loading zone data:', error);
        console.log('🔄 Using fallback data...');
        showFallbackData();
        return appData;
    }
}

// Fallback data if JSON fails to load
function showFallbackData() {
    console.log('🔄 Loading fallback data...');
    appData = {
        zones: [
            {
                id: "chandragiri",
                name: "Chandragiri Zone",
                icon: "📍",
                description: "Student residential area with hostels and colleges",
                address: "Near University Campus, Chandragiri Hills",
                population: "~15,000 students",
                keyAreas: ["Hostel blocks", "College campus", "Student market"],
                coordinates: { lat: 13.588, lng: 79.318 },
                emergencyContacts: [
                    {
                        name: "Chandragiri Police Station",
                        number: "+91-9876543201",
                        type: "critical",
                        icon: "🚓",
                        description: "Main police station for Chandragiri zone. Available 24/7 for emergencies."
                    },
                    {
                        name: "Chandragiri Health Center",
                        number: "+91-9876543203",
                        type: "support",
                        icon: "🏥",
                        description: "Local health center for medical emergencies."
                    }
                ],
                services: [
                    {
                        name: "Dr. Kumar's Clinic",
                        category: "clinic",
                        number: "+91-9876543210",
                        description: "General physician, open 9 AM - 9 PM",
                        verified: true
                    },
                    {
                        name: "Electric Solutions",
                        category: "electrician",
                        number: "+91-9876543211",
                        description: "24/7 electrical repairs and installations",
                        verified: true
                    },
                    {
                        name: "Quick Stitch Tailors",
                        category: "tailor",
                        number: "+91-9876543212",
                        description: "Clothing alterations and custom stitching",
                        verified: false
                    }
                ],
                alerts: [
                    "Traffic diversion near University Road 6–9 PM",
                    "Water supply maintenance on Friday 10 AM–2 PM",
                    "Power outage scheduled in Hostel Block B 2–4 PM"
                ]
            },
            {
                id: "tirupati",
                name: "Tirupati Zone",
                icon: "🕉️",
                description: "Temple city with religious tourism and commercial areas",
                address: "Tirupati City Center, Near Venkateswara Temple",
                population: "~35,000 residents",
                keyAreas: ["Temple complex", "Bus stand", "Railway station", "Hotels"],
                coordinates: { lat: 13.6288, lng: 79.4192 },
                emergencyContacts: [
                    {
                        name: "Tirupati City Police",
                        number: "+91-9876543301",
                        type: "critical",
                        icon: "🚓",
                        description: "Main police station for Tirupati city. Available 24/7."
                    },
                    {
                        name: "Temple Security",
                        number: "+91-9876543302",
                        type: "critical",
                        icon: "🛡️",
                        description: "Temple security for pilgrim safety and crowd control."
                    }
                ],
                alerts: [
                    "High pilgrim footfall expected this weekend",
                    "Railway station crowd management advisory",
                    "Heatwave alert — stay hydrated"
                ],
                services: [
                    {
                        name: "Tirupati Medical Center",
                        category: "clinic",
                        number: "+91-9876543310",
                        description: "Multi-specialty hospital with emergency care",
                        verified: true
                    },
                    {
                        name: "Temple Prasadam Counter",
                        category: "food",
                        number: "+91-9876543311",
                        description: "Sacred food distribution and booking",
                        verified: true
                    },
                    {
                        name: "Hotel Booking Service",
                        category: "hotel",
                        number: "+91-9876543312",
                        description: "Accommodation booking for pilgrims",
                        verified: true
                    }
                ]
            },
            {
                id: "srikalahasti",
                name: "Srikalahasti Zone",
                icon: "🌪️",
                description: "Ancient temple town with textile industry and heritage sites",
                address: "Srikalahasti Town, Near Panakala Narasimha Swamy Temple",
                population: "~25,000 residents",
                keyAreas: ["Temple complex", "Textile markets", "Heritage sites", "Industrial area"],
                coordinates: { lat: 13.7515, lng: 79.7036 },
                emergencyContacts: [
                    {
                        name: "Srikalahasti Police Station",
                        number: "+91-9876543401",
                        type: "critical",
                        icon: "🚓",
                        description: "Local police station serving Srikalahasti town."
                    },
                    {
                        name: "Srikalahasti Hospital",
                        number: "+91-9876543402",
                        type: "support",
                        icon: "🏥",
                        description: "Government hospital with emergency services."
                    }
                ],
                alerts: [
                    "Temple festival route changes announced",
                    "Strong winds expected in evening — secure loose items",
                    "Market hours extended till 10 PM"
                ],
                services: [
                    {
                        name: "Srikalahasti Medical Center",
                        category: "clinic",
                        number: "+91-9876543410",
                        description: "Primary healthcare center with emergency care",
                        verified: true
                    },
                    {
                        name: "Textile Market Hub",
                        category: "shopping",
                        number: "+91-9876543411",
                        description: "Wholesale and retail textile market",
                        verified: true
                    },
                    {
                        name: "Temple Darshan Services",
                        category: "tourist",
                        number: "+91-9876543412",
                        description: "Temple visit arrangements and guidance",
                        verified: true
                    }
                ]
            },
            {
                id: "puttur",
                name: "Puttur Zone",
                icon: "🌿",
                description: "Agricultural and rural development area with farming communities",
                address: "Puttur Town, Agricultural Development Zone",
                population: "~18,000 residents",
                keyAreas: ["Farming communities", "Agricultural markets", "Rural schools", "Health centers"],
                coordinates: { lat: 13.441, lng: 79.553 },
                emergencyContacts: [
                    {
                        name: "Puttur Police Station",
                        number: "+91-9876543601",
                        type: "critical",
                        icon: "🚓",
                        description: "Local police station serving Puttur and surrounding villages."
                    },
                    {
                        name: "Rural Health Center",
                        number: "+91-9876543602",
                        type: "support",
                        icon: "🏥",
                        description: "Primary healthcare center for rural communities."
                    }
                ],
                alerts: [
                    "Weekly farmers’ market on Saturday",
                    "Pest control advisory issued for fields",
                    "Road repairs near Cooperative Store"
                ],
                services: [
                    {
                        name: "Primary Health Center",
                        category: "clinic",
                        number: "+91-9876543610",
                        description: "Basic healthcare services for rural community",
                        verified: true
                    },
                    {
                        name: "Agricultural Market",
                        category: "market",
                        number: "+91-9876543611",
                        description: "Farm produce and agricultural supplies",
                        verified: true
                    },
                    {
                        name: "Seed and Fertilizer Store",
                        category: "agriculture",
                        number: "+91-9876543612",
                        description: "Agricultural inputs and farming supplies",
                        verified: true
                    }
                ]
            }
        ],
        nationalEmergencyNumbers: [
            {
                name: "Police Emergency",
                number: "100",
                type: "critical",
                icon: "🚨",
                description: "National police emergency number - Available 24/7"
            },
            {
                name: "Ambulance",
                number: "108",
                type: "critical",
                icon: "🚑",
                description: "Medical emergency ambulance service"
            },
            {
                name: "Fire Service",
                number: "101",
                type: "critical",
                icon: "🔥",
                description: "Fire department emergency response"
            },
            {
                name: "Women Helpline",
                number: "181",
                type: "support",
                icon: "👩",
                description: "24/7 women's safety helpline"
            }
        ],
        guidanceCategories: [
            {
                title: "Hidden Emergency Numbers",
                icon: "⚠️",
                items: [
                    "Railway Helpline: 139 (for train emergencies and complaints)",
                    "Cyber Crime: 1930 (for online fraud and cyber attacks)",
                    "Anti-Poison: 1800-180-5522 (for poisoning emergencies)",
                    "Senior Citizen Helpline: 14567 (elderly abuse and support)"
                ]
            },
            {
                title: "Legal Rights You Didn't Know",
                icon: "🛡️",
                items: [
                    "You can refuse to show your phone to police without a warrant",
                    "Landlords cannot enter your rented space without 24-hour notice",
                    "You have the right to record police interactions in public spaces"
                ]
            }
        ]
    };
    // Ensure ratings present in fallback (default 4.0)
    normalizeServiceRatings(4.0);
    console.log('✅ Fallback data loaded with', appData.zones.length, 'zones');
}

// Ensure every service has a numeric rating (used for search/filter)
function normalizeServiceRatings(defaultRating = 4.0) {
    if (!appData || !Array.isArray(appData.zones)) return;
    appData.zones.forEach(zone => {
        if (!Array.isArray(zone.services)) return;
        zone.services.forEach(svc => {
            if (typeof svc.rating !== 'number' || Number.isNaN(svc.rating)) {
                const cat = (svc.category || '').toString().trim().toLowerCase();
                const r = CATEGORY_DEFAULT_RATINGS.hasOwnProperty(cat) ? CATEGORY_DEFAULT_RATINGS[cat] : defaultRating;
                svc.rating = r;
            }
        });
    });
}

// Write back ratings to customZones copy in localStorage so they persist
function persistNormalizedCustomZonesRatings(defaultRating = 4.0) {
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    if (!Array.isArray(customZones) || !customZones.length) return;
    const updated = customZones.map(z => {
        if (Array.isArray(z.services)) {
            z.services = z.services.map(svc => {
                if (typeof svc.rating !== 'number' || Number.isNaN(svc.rating)) {
                    const cat = (svc.category || '').toString().trim().toLowerCase();
                    const r = CATEGORY_DEFAULT_RATINGS.hasOwnProperty(cat) ? CATEGORY_DEFAULT_RATINGS[cat] : defaultRating;
                    return { ...svc, rating: r };
                }
                return svc;
            });
        }
        return z;
    });
    localStorage.setItem('customZones', JSON.stringify(updated));
}

// Page navigation
function showPage(pageId) {
    // Enforce authentication: only login/signup are public
    const publicPages = ['login', 'signup'];
    if (!isAuthenticated && !publicPages.includes(pageId)) {
        showNotification('Please login to access this page.', 'error');
        pageId = 'login';
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    let targetPage = document.getElementById(pageId + '-page');
    if (!targetPage && appData && Array.isArray(appData.zones)) {
        const zone = appData.zones.find(z => z.id === pageId);
        if (zone) {
            // dynamically create zone page then continue
            renderZonePage(zone);
            targetPage = document.getElementById(pageId + '-page');
        }
    }
    if (!targetPage) {
        console.error(`Page ${pageId} not found`);
        showNotification('Page not found', 'error');
        return;
    }
    targetPage.classList.add('active');
    currentPage = pageId;
    // Load page-specific content
    loadPageContent(pageId);
    
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and activate the corresponding nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.textContent.toLowerCase().trim() === pageId) {
            link.classList.add('active');
        }
    });
}

// Admin UI helpers
function showAdminTab(tab) {
    const panes = ['add','service','newzonecs','addECExisting','messages'];
    panes.forEach(p => {
        const el = byId('adminTab-' + p);
        if (el) el.style.display = (p === tab) ? 'block' : 'none';
        const btn = document.querySelector(`[data-admin-tab="${p}"]`);
        if (btn) btn.classList.toggle('btn', p === tab), btn.classList.toggle('btn-secondary', p !== tab);
    });
    if (tab === 'service' || tab === 'newzonecs' || tab === 'addECExisting') populateAdminZoneSelects();
}

function initAdminUI() {
    showAdminTab('add');
    populateAdminZoneSelects();
    // reset temp arrays for field-based inputs
    window._newZoneContacts = [];
    window._newZoneServices = [];
    window._nzContacts = [];
    window._nzServices = [];
}

// Render services list with delete buttons for selected zone
function renderAdminServicesList(zoneId) {
    const wrap = byId('adminServicesList');
    const section = byId('adminServicesSection');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (section) section.style.display = 'none';
    if (!zoneId) return;
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (!z || !Array.isArray(z.services) || z.services.length === 0) {
        wrap.innerHTML = '';
        if (section) section.style.display = 'none';
        return;
    }
    wrap.innerHTML = z.services.map((s, idx) => `
      <div class="service-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div class="service-name">${s.name || ''} ${s.verified ? '<span class="verified-badge"><i class=\"fas fa-check\"></i> Verified</span>' : ''}</div>
          <div class="service-category">${(s.category || '').toUpperCase()}</div>
          ${s.address ? `<div class="service-address"><i class=\"fas fa-map-marker-alt\"></i> ${s.address}</div>` : ''}
          ${s.number ? `<div class="contact-number">${s.number}</div>` : ''}
          ${(typeof s.rating === 'number') ? `<div class="service-rating"><span class=\"rating-text\">Rating: ${s.rating}</span></div>` : ''}
        </div>
        <button class="btn btn-secondary" style="background:#ef4444" onclick="removeServiceFromZone('${zoneId}', ${idx})">Delete</button>
      </div>
    `).join('');
    if (section) section.style.display = 'block';
}

function removeServiceFromZone(zoneId, index) {
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (!z || !Array.isArray(z.services) || index < 0 || index >= z.services.length) return;
    if (!confirm('Delete this service?')) return;
    z.services.splice(index, 1);
    // persist for custom zones if exists
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    const ci = customZones.findIndex(x => x.id === zoneId);
    if (ci >= 0 && Array.isArray(customZones[ci].services)) {
        customZones[ci].services.splice(index, 1);
        localStorage.setItem('customZones', JSON.stringify(customZones));
    }
    renderAdminServicesList(zoneId);
    if (currentPage === 'services') renderServicesPage();
    showNotification('Service deleted.', 'success');
}

// Render contacts list with delete buttons for selected zone
function renderAdminContactsList(zoneId) {
    const wrap = byId('adminContactsList');
    const section = byId('adminContactsSection');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (section) section.style.display = 'none';
    if (!zoneId) return;
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (!z || !Array.isArray(z.emergencyContacts) || z.emergencyContacts.length === 0) {
        wrap.innerHTML = '';
        if (section) section.style.display = 'none';
        return;
    }
    wrap.innerHTML = z.emergencyContacts.map((c, idx) => `
      <div class="emergency-card ${c.type || ''}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div class="contact-name">${c.icon || ''} ${c.name || ''}</div>
          ${c.number ? `<div class="contact-number">${c.number}</div>` : ''}
          <div class="contact-description">${c.type ? '('+c.type+') ' : ''}${c.description || ''}</div>
        </div>
        <button class="btn btn-secondary" style="background:#ef4444" onclick="removeContactFromZone('${zoneId}', ${idx})">Delete</button>
      </div>
    `).join('');
}

function removeContactFromZone(zoneId, index) {
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (!z || !Array.isArray(z.emergencyContacts) || index < 0 || index >= z.emergencyContacts.length) return;
    if (!confirm('Delete this contact?')) return;
    z.emergencyContacts.splice(index, 1);
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    const ci = customZones.findIndex(x => x.id === zoneId);
    if (ci >= 0 && Array.isArray(customZones[ci].emergencyContacts)) {
        customZones[ci].emergencyContacts.splice(index, 1);
        localStorage.setItem('customZones', JSON.stringify(customZones));
    }
    renderAdminContactsList(zoneId);
    if (currentPage === 'emergency') renderEmergencyPage();
    showNotification('Contact deleted.', 'success');
}

// Custom zones manager
function renderAdminCustomZonesList() {
    const wrap = byId('adminCustomZonesList');
    const section = byId('adminCustomZonesSection');
    if (!wrap) return;
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    if (!customZones.length) { wrap.innerHTML = ''; if (section) section.style.display = 'none'; return; }
    wrap.innerHTML = customZones.map(z => `
      <div class="zone-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div class="zone-name">${z.icon || '📍'} ${z.name}</div>
          <div class="zone-description">${z.address || ''}</div>
        </div>
        <button class="btn btn-secondary" style="background:#ef4444" onclick="deleteCustomZone('${z.id}')">Delete Zone</button>
      </div>
    `).join('');
    if (section) section.style.display = 'block';
}

function deleteCustomZone(zoneId) {
    if (!confirm('Delete this custom zone?')) return;
    let customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    customZones = customZones.filter(z => z.id !== zoneId);
    localStorage.setItem('customZones', JSON.stringify(customZones));
    // remove from appData
    if (appData && Array.isArray(appData.zones)) {
        const idx = appData.zones.findIndex(z => z.id === zoneId);
        if (idx >= 0) appData.zones.splice(idx, 1);
    }
    // clear selector if needed
    if (selectedZoneId === zoneId) {
        selectedZoneId = '';
        localStorage.removeItem('selectedZoneId');
        const selector = byId('zoneSelector'); if (selector) selector.value = '';
    }
    // refresh UI
    renderHomePage();
    if (currentPage === 'services') renderServicesPage();
    if (currentPage === 'emergency') renderEmergencyPage();
    populateAdminZoneSelects();
    showNotification('Zone deleted.', 'success');
}

function populateAdminZoneSelects() {
    const existingSel = byId('adminExistingZoneSelect');
    const newSel = byId('adminNewZoneSelect');
    const existingECSel = byId('adminExistingECZoneSelect');
    const zones = appData?.zones || [];
    if (existingSel) {
        existingSel.innerHTML = '<option value="">Select zone</option>' + zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        existingSel.onchange = () => {
            renderAdminServicesList(existingSel.value);
        };
    }
    if (existingECSel) {
        existingECSel.innerHTML = '<option value="">Select zone</option>' + zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        existingECSel.onchange = () => {
            renderAdminContactsList(existingECSel.value);
        };
    }
    if (newSel) {
        const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
        newSel.innerHTML = '<option value="">Select new zone</option>' + customZones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
    }
    // Also refresh custom zones manager
    renderAdminCustomZonesList();
}

function handleAddServiceToZone(event) {
    event.preventDefault();
    const zoneId = byId('adminExistingZoneSelect')?.value;
    if (!zoneId) { showNotification('Select a zone.', 'error'); return; }
    const name = byId('serviceName')?.value?.trim();
    const category = byId('serviceCategory')?.value?.trim();
    const address = byId('serviceAddress')?.value?.trim();
    const number = byId('servicePhone')?.value?.trim();
    const description = byId('serviceDescription')?.value?.trim();
    const rating = parseFloat(byId('serviceRating')?.value || '') || undefined;
    const verified = !!byId('serviceVerified')?.checked;
    if (!name || !category) { showNotification('Service name and category are required.', 'error'); return; }
    const svc = { name, category, address, number, description, rating, verified };
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (!z) { showNotification('Zone not found.', 'error'); return; }
    z.services = Array.isArray(z.services) ? z.services : [];
    z.services.push(svc);
    // persist for custom zones
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    const idx = customZones.findIndex(x => x.id === zoneId);
    if (idx >= 0) {
        customZones[idx].services = Array.isArray(customZones[idx].services) ? customZones[idx].services : [];
        customZones[idx].services.push(svc);
        localStorage.setItem('customZones', JSON.stringify(customZones));
    }
    // refresh UI
    renderHomePage();
    if (currentPage === 'services') renderServicesPage();
    byId('addServiceForm')?.reset();
    renderAdminServicesList(zoneId);
    showNotification('Service added to zone.', 'success');
}

function handleAddContactsServicesToNewZone(event) {
    event.preventDefault();
    const zoneId = byId('adminNewZoneSelect')?.value;
    if (!zoneId) { showNotification('Select a new zone.', 'error'); return; }
    const contacts = Array.isArray(window._nzContacts) ? window._nzContacts : [];
    const services = Array.isArray(window._nzServices) ? window._nzServices : [];
    const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
    const idx = customZones.findIndex(x => x.id === zoneId);
    if (idx < 0) { showNotification('New zone not found in local storage.', 'error'); return; }
    customZones[idx].emergencyContacts = contacts;
    customZones[idx].services = services;
    localStorage.setItem('customZones', JSON.stringify(customZones));
    // reflect in appData
    const z = appData?.zones?.find(x => x.id === zoneId);
    if (z) { z.emergencyContacts = contacts; z.services = services; }
    renderHomePage();
    if (currentPage === 'emergency') renderEmergencyPage();
    if (currentPage === 'services') renderServicesPage();
    byId('addCSNewZoneForm')?.reset();
    // reset temp arrays and lists
    window._nzContacts = [];
    window._nzServices = [];
    const nzECList = byId('nzECList');
    const nzSvcList = byId('nzSvcList');
    if (nzECList) nzECList.innerHTML = '';
    if (nzSvcList) nzSvcList.innerHTML = '';
    showNotification('Contacts/Services saved to the zone.', 'success');
}

// Admin field-based additions: helpers to add items to temp arrays and render lists
function addNewZoneContact() {
  const name = byId('newECName')?.value?.trim();
  const number = byId('newECNumber')?.value?.trim();
  const type = byId('newECType')?.value?.trim();
  const icon = byId('newECIcon')?.value?.trim();
  const description = byId('newECDesc')?.value?.trim();
  if (!name || !number) { showNotification('Contact name and phone are required.', 'error'); return; }
  window._newZoneContacts = Array.isArray(window._newZoneContacts) ? window._newZoneContacts : [];
  window._newZoneContacts.push({ name, number, type, icon, description });
  renderTempList('newECList', window._newZoneContacts, 'contact');
  // clear small inputs
  ['newECName','newECNumber','newECDesc','newECIcon'].forEach(id=>{ const el=byId(id); if (el) el.value=''; });
  const t = byId('newECType'); if (t) t.value='';
}

function addNewZoneService() {
  const name = byId('newSvcName')?.value?.trim();
  const category = byId('newSvcCategory')?.value?.trim();
  const address = byId('newSvcAddress')?.value?.trim();
  const number = byId('newSvcNumber')?.value?.trim();
  const description = byId('newSvcDesc')?.value?.trim();
  const rating = parseFloat(byId('newSvcRating')?.value || '') || undefined;
  const verified = !!byId('newSvcVerified')?.checked;
  if (!name || !category) { showNotification('Service name and category are required.', 'error'); return; }
  window._newZoneServices = Array.isArray(window._newZoneServices) ? window._newZoneServices : [];
  window._newZoneServices.push({ name, category, address, number, description, rating, verified });
  renderTempList('newSvcList', window._newZoneServices, 'service');
  ['newSvcName','newSvcCategory','newSvcAddress','newSvcNumber','newSvcDesc','newSvcRating'].forEach(id=>{ const el=byId(id); if (el) el.value=''; });
  const chk = byId('newSvcVerified'); if (chk) chk.checked = false;
}

function addNZContact() {
  const name = byId('nzECName')?.value?.trim();
  const number = byId('nzECNumber')?.value?.trim();
  const type = byId('nzECType')?.value?.trim();
  const icon = byId('nzECIcon')?.value?.trim();
  const description = byId('nzECDesc')?.value?.trim();
  if (!name || !number) { showNotification('Contact name and phone are required.', 'error'); return; }
  window._nzContacts = Array.isArray(window._nzContacts) ? window._nzContacts : [];
  window._nzContacts.push({ name, number, type, icon, description });
  renderTempList('nzECList', window._nzContacts, 'contact');
  ['nzECName','nzECNumber','nzECDesc','nzECIcon'].forEach(id=>{ const el=byId(id); if (el) el.value=''; });
  const t = byId('nzECType'); if (t) t.value='';
}

function addNZService() {
  const name = byId('nzSvcName')?.value?.trim();
  const category = byId('nzSvcCategory')?.value?.trim();
  const address = byId('nzSvcAddress')?.value?.trim();
  const number = byId('nzSvcNumber')?.value?.trim();
  const description = byId('nzSvcDesc')?.value?.trim();
  const rating = parseFloat(byId('nzSvcRating')?.value || '') || undefined;
  const verified = !!byId('nzSvcVerified')?.checked;
  if (!name || !category) { showNotification('Service name and category are required.', 'error'); return; }
  window._nzServices = Array.isArray(window._nzServices) ? window._nzServices : [];
  window._nzServices.push({ name, category, address, number, description, rating, verified });
  renderTempList('nzSvcList', window._nzServices, 'service');
  ['nzSvcName','nzSvcCategory','nzSvcAddress','nzSvcNumber','nzSvcDesc','nzSvcRating'].forEach(id=>{ const el=byId(id); if (el) el.value=''; });
  const chk = byId('nzSvcVerified'); if (chk) chk.checked = false;
}

function renderTempList(elementId, items, kind) {
  const el = byId(elementId); if (!el) return;
  if (!Array.isArray(items) || !items.length) { el.innerHTML = ''; return; }
  el.innerHTML = items.map((it, idx) => {
    if (kind === 'contact') {
      return `<li>${it.icon || ''} <strong>${it.name}</strong> - ${it.number} ${it.type ? '('+it.type+')' : ''}</li>`;
    }
    const r = (typeof it.rating === 'number') ? ` • Rating: ${it.rating}` : '';
    const addr = it.address ? ` • ${it.address}` : '';
    return `<li><strong>${it.name}</strong> - ${it.category || ''}${addr}${r} ${it.verified ? '<span class="verified-badge">Verified</span>' : ''}</li>`;
  }).join('');
}

function handleAddEmergencyToExistingZone(event) {
  event.preventDefault();
  const zoneId = byId('adminExistingECZoneSelect')?.value;
  const name = byId('exECName')?.value?.trim();
  const number = byId('exECNumber')?.value?.trim();
  const type = byId('exECType')?.value?.trim();
  const icon = byId('exECIcon')?.value?.trim();
  const description = byId('exECDesc')?.value?.trim();
  if (!zoneId || !name || !number) { showNotification('Select zone and fill required fields.', 'error'); return; }
  const contact = { name, number, type, icon, description };
  const z = appData?.zones?.find(x => x.id === zoneId);
  if (!z) { showNotification('Zone not found.', 'error'); return; }
  z.emergencyContacts = Array.isArray(z.emergencyContacts) ? z.emergencyContacts : [];
  z.emergencyContacts.push(contact);
  // persist for custom zones
  const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
  const idx = customZones.findIndex(x => x.id === zoneId);
  if (idx >= 0) {
    customZones[idx].emergencyContacts = Array.isArray(customZones[idx].emergencyContacts) ? customZones[idx].emergencyContacts : [];
    customZones[idx].emergencyContacts.push(contact);
    localStorage.setItem('customZones', JSON.stringify(customZones));
  }
  renderHomePage();
  if (currentPage === 'emergency') renderEmergencyPage();
  byId('addECExistingForm')?.reset();
  renderAdminContactsList(zoneId);
  showNotification('Emergency contact added to zone.', 'success');
}
function renderAlertsForZone(zone) {
    const zoneNameEl = document.getElementById('alertsZoneName');
    const list = document.getElementById('alertsList');
    const empty = document.getElementById('alertsEmpty');
    if (!zoneNameEl || !list) return;
    zoneNameEl.textContent = zone?.name || '-';
    list.innerHTML = '';
    const alerts = (zone && Array.isArray(zone.alerts)) ? zone.alerts : [];
    if (!alerts.length) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    alerts.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = msg;
        list.appendChild(li);
    });
}
// Load page-specific content
function loadPageContent(pageId) {
    switch (pageId) {
        case 'home':
            renderHomePage();
            break;
        case 'zones':
            renderZonesPage();
            break;
        case 'emergency':
            renderEmergencyPage();
            break;
        case 'services':
            renderServicesPage();
            break;
        case 'guidance':
            renderGuidancePage();
            break;
        case 'user-dashboard':
            renderUserDashboard();
            break;
        case 'alerts':
            if (appData && selectedZoneId) {
                const z = appData.zones.find(zz => zz.id === selectedZoneId);
                if (z) renderAlertsForZone(z);
            }
            break;
        case 'map':
            renderMapPage();
            break;
        case 'admin-dashboard':
            renderAdminDashboard();
            break;
        case 'contact':
            // Contact page is static, no dynamic content needed
            break;
        case 'login':
        case 'signup':
            // Auth pages don't need dynamic content
            break;
        case 'admin':
            // protected page (only admin emails)
            const session = JSON.parse(localStorage.getItem('sessionUser') || 'null');
            if (!session || !ADMIN_EMAILS.includes(session.email)) {
                showNotification('Please login to access Admin.', 'error');
                showPage('login');
                return;
            }
            initAdminUI();
            renderAdminMessages();
            break;
        default:
            // Check if it's a zone-specific page
            if (appData && appData.zones) {
                const zone = appData.zones.find(z => z.id === pageId);
                if (zone) {
                    renderZonePage(zone);
                }
            }
            break;
    }
}

// Render home page with zone cards
function renderHomePage() {
    console.log('🔄 Rendering home page...');
    console.log('App data:', appData);
    
    if (!appData || !appData.zones) {
        console.error('❌ No app data or zones found');
        const container = byId('home-zone-grid');
        if (container) {
            container.innerHTML = '<div class="error">No zone data available. Please check the console for errors.</div>';
        }
        return;
    }
    
    const container = byId('home-zone-grid');
    if (!container) {
        console.error('❌ Home zone grid container not found');
        return;
    }
    
    console.log('✅ Rendering', appData.zones.length, 'zones');
    
    container.innerHTML = appData.zones.map(zone => {
        const servicesCount = Array.isArray(zone.services) ? zone.services.length : 0;
        const emergencyCount = Array.isArray(zone.emergencyContacts) ? zone.emergencyContacts.length : 0;

        return `
            <div class="zone-card" onclick="onSelectZone('${zone.id}')">
                <div class="zone-name">${zone.icon || '📍'} ${zone.name || 'Unnamed Zone'}</div>
                <div class="zone-description">${zone.description || ''}</div>
                <div class="zone-stats">
                    <span>${servicesCount} Services</span>
                    <span>${emergencyCount} Emergency Contacts</span>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Home page rendered successfully');
}

// Render zones page
function renderZonesPage() {
    console.log('🔄 Rendering zones page...');
    console.log('App data:', appData);
    
    if (!appData || !appData.zones) {
        console.error('❌ No app data or zones found for zones page');
        const container = byId('zones-zone-grid');
        if (container) {
            container.innerHTML = '<div class="error">No zone data available. Please check the console for errors.</div>';
        }
        return;
    }
    
    const container = byId('zones-zone-grid');
    if (!container) {
        console.error('❌ Zones zone grid container not found');
        return;
    }
    
    console.log('✅ Rendering', appData.zones.length, 'zones for zones page');
    
    container.innerHTML = appData.zones.map(zone => {
        const keyAreas = Array.isArray(zone.keyAreas) ? zone.keyAreas.join(', ') : (zone.keyAreas || '');
        const servicesCount = Array.isArray(zone.services) ? zone.services.length : 0;
        const emergencyCount = Array.isArray(zone.emergencyContacts) ? zone.emergencyContacts.length : 0;
        
        return `
            <div class="zone-card" onclick="onSelectZone('${zone.id}')">
                <div class="zone-name">${zone.icon || '📍'} ${zone.name || 'Unnamed Zone'}</div>
            <div class="zone-description">
                    <strong>Address:</strong> ${zone.address || 'N/A'}<br>
                    <strong>Population:</strong> ${zone.population || 'N/A'}<br>
                <strong>Key Areas:</strong> ${keyAreas}
            </div>
            <div class="zone-stats">
                <span>${servicesCount} Services</span>
                <span>${emergencyCount} Emergency Contacts</span>
            </div>
        </div>
        `;
    }).join('');
    
    console.log('✅ Zones page rendered successfully');
}

// Render emergency page
function renderEmergencyPage() {
    if (!appData) return;
    
    const container = byId('emergency-grid');
    if (!container) return;
    
    let emergencyContacts = [];
    
    // Add national emergency numbers
    if (appData.nationalEmergencyNumbers) {
        emergencyContacts = [...appData.nationalEmergencyNumbers];
    }
    
    // Add zone-specific emergency contacts
    if (appData.zones) {
        appData.zones.forEach(zone => {
            if (zone.emergencyContacts) {
                emergencyContacts = emergencyContacts.concat(
                    zone.emergencyContacts.map(contact => ({
                        ...contact,
                        zoneName: zone.name,
                        zoneId: zone.id
                    }))
                );
            }
        });
    }
    
    container.innerHTML = emergencyContacts.map(contact => `
        <div class="emergency-card ${contact.type || ''}" data-zone="${contact.zoneId || ''}" data-type="${contact.type || ''}">
            <div class="contact-name">${contact.icon || ''} ${contact.name || ''}</div>
            <a href="tel:${contact.number || ''}" class="contact-number">${contact.number || ''}</a>
            <div class="contact-description">${contact.description || ''}</div>
            ${contact.availability ? `<div class="contact-availability">⏰ ${contact.availability}</div>` : ''}
            ${contact.language_support ? `<div class="contact-languages">🗣️ ${contact.language_support.join(', ')}</div>` : ''}
            ${contact.zoneName ? `<div class="zone-badge">${contact.zoneName}</div>` : ''}
        </div>
    `).join('');

    // Setup filtering
    setupEmergencyFiltering();
}

// Setup emergency filtering
function setupEmergencyFiltering() {
    const zoneFilter = byId('emergencyZoneFilter');
    const typeFilter = byId('emergencyTypeFilter');
    
    if (zoneFilter) {
        zoneFilter.addEventListener('change', filterEmergencyContacts);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', filterEmergencyContacts);
    }
}

// Filter emergency contacts
function filterEmergencyContacts() {
    const zoneFilter = byId('emergencyZoneFilter');
    const typeFilter = byId('emergencyTypeFilter');
    const cards = document.querySelectorAll('.emergency-card');
    
    const selectedZone = zoneFilter ? zoneFilter.value : '';
    const selectedType = typeFilter ? typeFilter.value : '';
    
    cards.forEach(card => {
        const cardZone = card.getAttribute('data-zone');
        const cardType = card.getAttribute('data-type');
        
        const zoneMatch = !selectedZone || cardZone === selectedZone || (!cardZone && selectedZone === '');
        const typeMatch = !selectedType || cardType === selectedType;
        
        card.style.display = (zoneMatch && typeMatch) ? 'block' : 'none';
    });
}

// Render services page
function renderServicesPage() {
    if (!appData || !appData.zones) return;
    
    const container = byId('servicesGrid');
    if (!container) return;
    
    let allServices = [];
    
    // Collect all services from all zones
    appData.zones.forEach(zone => {
        if (zone.services) {
            allServices = allServices.concat(
                zone.services.map(service => ({
                    ...service,
                    zoneName: zone.name,
                    zoneId: zone.id
                }))
            );
        }
    });
    
    container.innerHTML = allServices.map(service => `
        <div class="service-card" data-category="${service.category || ''}" data-zone="${service.zoneId}" data-rating="${service.rating || 0}">
            <div class="service-name">
                ${service.name || ''}
                ${service.verified ? '<span class="verified-badge"><i class="fas fa-check"></i> Verified</span>' : ''}
            </div>
            <div class="service-category">${(service.category || '').charAt(0).toUpperCase() + (service.category || '').slice(1)}</div>
            <a href="tel:${service.number || ''}" class="contact-number">${service.number || ''}</a>
            <div class="contact-description">${service.description || ''}</div>
            ${service.address ? `<div class="service-address">📍 ${service.address}</div>` : ''}
            ${service.hours ? `<div class="service-hours">⏰ ${service.hours}</div>` : ''}
            ${service.priceRange ? `<div class="service-price">💰 ${service.priceRange}</div>` : ''}
            ${service.services ? `<div class="service-services">🔧 ${service.services.join(', ')}</div>` : ''}
            ${service.specialties ? `<div class="service-specialties">⭐ ${service.specialties.join(', ')}</div>` : ''}
            ${service.paymentMethods ? `<div class="service-payment">💳 ${service.paymentMethods.join(', ')}</div>` : ''}
            ${service.languages ? `<div class="service-languages">🗣️ ${service.languages.join(', ')}</div>` : ''}
            <div class="service-zone-badge">${service.zoneName}</div>
            ${service.rating ? `
                <div class="service-rating">
                    <div class="stars">${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))}</div>
                    <span class="rating-text">${service.rating}/5</span>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Setup filtering
    setupServiceFiltering();
}

// Setup service filtering
function setupServiceFiltering() {
    const searchInput = byId('serviceSearch');
    const zoneFilter = byId('zoneFilter');
    const serviceFilter = byId('serviceFilter');
    const ratingFilter = byId('ratingFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterServices);
    }
    if (zoneFilter) {
        zoneFilter.addEventListener('change', filterServices);
    }
    if (serviceFilter) {
        serviceFilter.addEventListener('change', filterServices);
    }
    if (ratingFilter) {
        ratingFilter.addEventListener('change', filterServices);
    }
}

// Filter services
function filterServices() {
    const searchTerm = (byId('serviceSearch')?.value || '').toLowerCase();
    const zoneFilter = byId('zoneFilter')?.value || '';
    const serviceFilter = byId('serviceFilter')?.value || '';
    const ratingFilter = byId('ratingFilter')?.value || '';
    
    const cards = document.querySelectorAll('.service-card');
    
    cards.forEach(card => {
        const serviceName = card.querySelector('.service-name')?.textContent.toLowerCase() || '';
        const category = card.getAttribute('data-category') || '';
        const zone = card.getAttribute('data-zone') || '';
        const rating = parseFloat(card.getAttribute('data-rating')) || 0;
        
        const matchesSearch = serviceName.includes(searchTerm);
        const matchesZone = !zoneFilter || zone === zoneFilter;
        const matchesCategory = !serviceFilter || category === serviceFilter;
        const matchesRating = !ratingFilter || rating >= parseFloat(ratingFilter);
        
        card.style.display = (matchesSearch && matchesZone && matchesCategory && matchesRating) ? 'block' : 'none';
    });
}

// Render guidance page
function renderGuidancePage() {
    if (!appData || !appData.guidanceCategories) return;
    
    const container = document.querySelector('#guidance-page .section');
    if (!container) return;
    
    // Clear existing content except the title
    const title = container.querySelector('.section-title');
    container.innerHTML = '';
    if (title) {
        container.appendChild(title);
    }
    
    // Add guidance categories
    appData.guidanceCategories.forEach(category => {
        const accordion = document.createElement('div');
        accordion.className = 'guidance-accordion';
        accordion.innerHTML = `
            <div class="guidance-header" onclick="toggleGuidance(this)">
                <span><i class="fas fa-${category.icon || 'info-circle'}"></i> ${category.title}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="guidance-content">
                ${category.items.map(item => `
                    <div class="guidance-item">${item}</div>
                `).join('')}
            </div>
        `;
        container.appendChild(accordion);
    });
}

// (removed) updateNavVisibility: not needed; nav links handled in init/login/logout

// Initialize map
function initMap() {
    const mapContainer = byId('map');
    if (!mapContainer || !appData || !appData.zones) return;
    
    // Initialize Leaflet map
    leafletMap = L.map('map').setView([13.6288, 79.4192], 10);
    
    // Add base layers with offline fallback
    baseLayers = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }),
        carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', { 
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CARTO'
        }),
        carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { 
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CARTO'
        }),
        esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { 
            maxZoom: 19,
            attribution: '© Esri'
        }),
        esri_sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
            maxZoom: 19,
            attribution: '© Esri'
        }),
        stamen: L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', { 
            maxZoom: 19,
            attribution: '© Stamen Design'
        })
    };
    
    // Add default layer (OpenStreetMap)
    currentBase = baseLayers.osm.addTo(leafletMap);
    
    // Add offline detection and fallback
    if (!navigator.onLine) {
        showNotification('You are offline. Map tiles may not load properly.', 'info');
    }
    
    // Add zone markers
    zoneMarkers = [];
    const zoneColors = {
        chandragiri: '#e53e3e',
        tirupati: '#3182ce',
        srikalahasti: '#38a169',
        renigunta: '#d69e2e',
        puttur: '#805ad5'
    };
    appData.zones.forEach(zone => {
        if (zone.coordinates) {
            let lat, lng;
            if (Array.isArray(zone.coordinates)) {
                [lat, lng] = zone.coordinates;
            } else {
                lat = zone.coordinates.lat;
                lng = zone.coordinates.lng;
            }
            
            if (typeof lat === 'number' && typeof lng === 'number') {
                const color = zoneColors[zone.id] || '#2d3748';
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 2
                }).addTo(leafletMap).bindPopup(`
                        <b>${zone.name || 'Zone'}</b><br>
                        ${zone.address || ''}<br>
                        <small>${zone.description || ''}</small>
                    `);
                zoneMarkers.push({ zone, marker });
            }
        }
    });
    
    // Setup map controls
    setupMapControls();

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.background = 'white';
        div.style.padding = '8px 10px';
        div.style.borderRadius = '8px';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        const entries = [
            ['Chandragiri', '#e53e3e'],
            ['Tirupati', '#3182ce'],
            ['Srikalahasti', '#38a169'],
            ['Renigunta', '#d69e2e'],
            ['Puttur', '#805ad5']
        ];
        div.innerHTML = entries.map(([n,c]) => `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><span style="display:inline-block;width:12px;height:12px;background:${c};border-radius:50%;"></span>${n}</div>`).join('');
        return div;
    };
    legend.addTo(leafletMap);
    
    // Add online/offline event listeners
    window.addEventListener('online', () => {
        showNotification('Connection restored. Map tiles will load normally.', 'success');
        updateOfflineIndicator(false);
    });
    
    window.addEventListener('offline', () => {
        showNotification('Connection lost. Some map features may not work.', 'error');
        updateOfflineIndicator(true);
    });
    
    // Initialize offline indicator
    updateOfflineIndicator(!navigator.onLine);
}

// Setup map controls
function setupMapControls() {
    const tileProvider = byId('tileProvider');
    const locateBtn = byId('btnLocate');
    const resetBtn = byId('btnReset');
    const toggleServices = byId('toggleServicesOnMap');
    const svcCategory = byId('mapServiceCategory');
    
    if (tileProvider) {
        tileProvider.addEventListener('change', (e) => {
            if (currentBase) {
                leafletMap.removeLayer(currentBase);
            }
            currentBase = baseLayers[e.target.value].addTo(leafletMap);
        });
    }
    
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    leafletMap.setView([position.coords.latitude, position.coords.longitude], 15);
                });
            } else {
                showNotification('Geolocation not supported', 'error');
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            leafletMap.setView([13.6288, 79.4192], 10);
        });
    }
    
    const applyServiceFilters = () => {
        if (!leafletMap || !serviceLayer) return;
        const show = toggleServices ? !!toggleServices.checked : false;
        const category = svcCategory ? (svcCategory.value || '') : '';
        if (serviceLayer) leafletMap.removeLayer(serviceLayer);
        buildServicesLayer(category);
        if (show && serviceLayer) serviceLayer.addTo(leafletMap);
    };
    if (toggleServices) toggleServices.addEventListener('change', applyServiceFilters);
    if (svcCategory) svcCategory.addEventListener('change', applyServiceFilters);

    // (removed) map search handlers
}
// (removed) map search helpers

// Build service markers layer with optional category filter
function buildServicesLayer(categoryFilter = '') {
    if (!appData || !appData.zones) return;
    if (serviceLayer) {
        try { serviceLayer.clearLayers(); } catch {}
    }
    serviceLayer = L.layerGroup();
    const jitter = (n) => (Math.random() - 0.5) * n;
    const addMarker = (lat, lng, service, zone) => {
        const marker = L.marker([lat, lng]);
        const rating = (typeof service.rating === 'number') ? ` • Rating: ${service.rating}` : '';
        const addr = service.address ? `<div class="service-address"><i class=\"fas fa-map-marker-alt\"></i> ${service.address}</div>` : '';
        marker.bindPopup(`
            <div style="min-width:200px">
                <div class="service-name">${service.name || ''} ${service.verified ? '<span class=\"verified-badge\"><i class=\"fas fa-check\"></i> Verified</span>' : ''}</div>
                <div class="service-category">${(service.category || '').toUpperCase()} • ${zone.name}</div>
                ${addr}
                ${service.number ? `<div class=\"contact-number\">${service.number}</div>` : ''}
                ${rating ? `<div class=\"service-rating\"><span class=\"rating-text\">${rating.replace(' • ', '')}</span></div>` : ''}
                ${service.description ? `<div class=\"contact-description\">${service.description}</div>` : ''}
            </div>
        `);
        serviceLayer.addLayer(marker);
    };
    appData.zones.forEach(zone => {
        if (!zone) return;
        const zcoords = Array.isArray(zone.coordinates) ? {lat: zone.coordinates[0], lng: zone.coordinates[1]} : zone.coordinates;
        const zlat = zcoords && typeof zcoords.lat === 'number' ? zcoords.lat : null;
        const zlng = zcoords && typeof zcoords.lng === 'number' ? zcoords.lng : null;
        if (!Array.isArray(zone.services)) return;
        zone.services.forEach(service => {
            if (categoryFilter && (service.category || '') !== categoryFilter) return;
            let lat = undefined, lng = undefined;
            if (Array.isArray(service.coordinates)) {
                lat = service.coordinates[0];
                lng = service.coordinates[1];
            } else if (service.coordinates && typeof service.coordinates.lat === 'number' && typeof service.coordinates.lng === 'number') {
                lat = service.coordinates.lat;
                lng = service.coordinates.lng;
            } else if (typeof zlat === 'number' && typeof zlng === 'number') {
                lat = zlat + jitter(0.01);
                lng = zlng + jitter(0.01);
            }
            if (typeof lat === 'number' && typeof lng === 'number') {
                addMarker(lat, lng, service, zone);
            }
        });
    });
}

// Render individual zone page
function renderZonePage(zone) {
    // Create zone page if it doesn't exist
    let pageId = `${zone.id}-page`;
    let page = byId(pageId);
    
    if (!page) {
        page = document.createElement('div');
        page.id = pageId;
        page.className = 'page';
        document.body.insertBefore(page, document.querySelector('footer'));
    }
    
    const emergencyHTML = (zone.emergencyContacts || []).map(contact => `
        <div class="emergency-card ${contact.type || ''}">
            <div class="contact-name">${contact.icon || ''} ${contact.name || ''}</div>
            <a href="tel:${contact.number || ''}" class="contact-number">${contact.number || ''}</a>
            <div class="contact-description">${contact.description || ''}</div>
        </div>
    `).join('');
    
    const servicesHTML = (zone.services || []).map(service => `
        <div class="service-card" data-category="${service.category || ''}">
            <div class="service-name">
                ${service.name || ''}
                ${service.verified ? '<span class="verified-badge"><i class="fas fa-check"></i> Verified</span>' : ''}
            </div>
            <div class="service-category">${(service.category || '').charAt(0).toUpperCase() + (service.category || '').slice(1)}</div>
            <a href="tel:${service.number || ''}" class="contact-number">${service.number || ''}</a>
            <div class="contact-description">${service.description || ''}</div>
                </div>
            `).join('');

    page.innerHTML = `
            <div class="container">
                <header>
                <h1 class="logo">${zone.icon || '📍'} ${zone.name || 'Unnamed Zone'}</h1>
                <p class="subtitle">${zone.description || ''}</p>
                <div class="zone-badge">${zone.address || ''}</div>
                </header>
                <main>
                    <section class="section">
                        <h2 class="section-title"><i class="fas fa-phone-alt"></i> Local Emergency Contacts</h2>
                        <div class="emergency-grid">${emergencyHTML}</div>
                    </section>
                    <section class="section">
                        <h2 class="section-title"><i class="fas fa-store"></i> Nearby Services</h2>
                        <div class="services-grid">${servicesHTML}</div>
                    </section>
                </main>
        </div>
    `;
}

// Dark mode functionality
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const toggle = document.querySelector('.dark-mode-toggle');
    if (toggle) {
        toggle.textContent = isDark ? '☀️' : '🌙';
    }
}

// Load dark mode preference
function loadDarkModePreference() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const toggle = document.querySelector('.dark-mode-toggle');
        if (toggle) {
            toggle.textContent = '☀️';
        }
    }
}

// Guidance accordion functionality
function toggleGuidance(header) {
    const content = header.nextElementSibling;
    const isActive = content.classList.contains('active');
    
    // Close all other accordions
    document.querySelectorAll('.guidance-content').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.guidance-header').forEach(item => {
        item.classList.remove('active');
    });
    
    // Toggle current accordion
    if (!isActive) {
        content.classList.add('active');
        header.classList.add('active');
    }
}

// Authentication functions
function handleLogin(event) {
    event.preventDefault();
    const email = byId('loginEmail')?.value;
    const password = byId('loginPassword')?.value;
    if (!email || !password) {
        showNotification('Please fill in all fields.', 'error');
        return;
    }
    // Check for admin login first
    if (email === 'admin@zonevault.local' && password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem('sessionUser', JSON.stringify({ 
            email: 'admin@zonevault.local', 
            zone: 'admin', 
            is_admin: true, 
            token: 'admin_token_' + Date.now() 
        }));
        const adminLink = byId('adminLink');
        const userDashLink = byId('userDashboardLink');
        const adminDashLink = byId('adminDashboardLink');
        const logoutLink = byId('logoutLink');
        if (adminLink) adminLink.style.display = 'inline';
        if (userDashLink) userDashLink.style.display = 'inline';
        if (adminDashLink) adminDashLink.style.display = 'inline';
        if (logoutLink) logoutLink.style.display = 'inline';
        showNotification('Admin login successful! Welcome to ZoneVault.', 'success');
        showPage('home');
        return;
    }
    
    // Regular user login
    fetch(`${API_BASE}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }).then(async r => {
        let data = null;
        try { data = await r.json(); } catch {}
        if (!r.ok) {
            const msg = (data && data.error) ? data.error : `HTTP error ${r.status}`;
            throw new Error(msg);
        }
        return data;
    }).then(res => {
        if (res && res.success) {
            const user = res.user;
            isAuthenticated = true;
            localStorage.setItem('sessionUser', JSON.stringify({ email: user.email, zone: user.zone, is_admin: user.is_admin, token: res.token }));
            const adminLink = byId('adminLink');
            const userDashLink = byId('userDashboardLink');
            const adminDashLink = byId('adminDashboardLink');
            const logoutLink = byId('logoutLink');
            const isAdmin = !!user.is_admin || ADMIN_EMAILS.includes(user.email);
            if (adminLink) adminLink.style.display = isAdmin ? 'inline' : 'none';
            if (userDashLink) userDashLink.style.display = 'inline';
            if (adminDashLink) adminDashLink.style.display = isAdmin ? 'inline' : 'none';
            if (logoutLink) logoutLink.style.display = 'inline';
            showNotification('Login successful! Welcome to ZoneVault.', 'success');
            if (user.zone) {
                selectedZoneId = user.zone;
                localStorage.setItem('selectedZoneId', selectedZoneId);
            }
            showPage('home');
        } else {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            if (!user) {
                showNotification(res?.error || 'Incorrect email or password.', 'error');
                return;
            }
            isAuthenticated = true;
            localStorage.setItem('sessionUser', JSON.stringify({ email: user.email, zone: user.zone }));
            const adminLink = byId('adminLink');
            const userDashLink = byId('userDashboardLink');
            const adminDashLink = byId('adminDashboardLink');
            const logoutLink = byId('logoutLink');
            if (adminLink) adminLink.style.display = ADMIN_EMAILS.includes(user.email) ? 'inline' : 'none';
            if (userDashLink) userDashLink.style.display = 'inline';
            if (adminDashLink) adminDashLink.style.display = ADMIN_EMAILS.includes(user.email) ? 'inline' : 'none';
            if (logoutLink) logoutLink.style.display = 'inline';
            showNotification('Login successful! Welcome to ZoneVault.', 'success');
            if (user.zone) {
                selectedZoneId = user.zone;
                localStorage.setItem('selectedZoneId', selectedZoneId);
            }
            showPage('home');
        }
    }).catch((error) => {
        console.error('Login API error:', error);
        showNotification(error.message || 'Login failed. Please try again.', 'error');
    });
}

// -----------------------------------------------------------
// script.js (Final Correct Version for ZoneVault Integration)
// -----------------------------------------------------------

async function handleAddZone(event) {
  event.preventDefault();

  const name = document.getElementById('zoneName').value.trim();
  const description = document.getElementById('zoneDescription').value.trim();
  const address = document.getElementById('zoneAddress').value.trim();
  const lat = parseFloat(document.getElementById('zoneLat').value.trim());
  const lng = parseFloat(document.getElementById('zoneLng').value.trim());
  const icon = document.getElementById('zoneIcon').value.trim();
  const alertsRaw = document.getElementById('zoneAlerts').value.trim();
  // Gather contacts/services from in-memory arrays built by addNewZoneContact/addNewZoneService
  const emergencyContacts = Array.isArray(window._newZoneContacts) ? window._newZoneContacts : [];
  const services = Array.isArray(window._newZoneServices) ? window._newZoneServices : [];

  // Build zone id from name
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const alerts = alertsRaw ? alertsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  // arrays already prepared from UI fields

  const zone = {
    id,
    name,
    icon,
    description,
    address,
    coordinates: { lat, lng },
    emergencyContacts,
    services,
    alerts
  };

  // Update local customZones immediately for UI
  const customZones = JSON.parse(localStorage.getItem('customZones') || '[]');
  const existingIdx = customZones.findIndex(z => z.id === id);
  if (existingIdx >= 0) customZones[existingIdx] = zone; else customZones.push(zone);
  localStorage.setItem('customZones', JSON.stringify(customZones));

  // Merge into in-memory data and refresh UI
  if (appData && Array.isArray(appData.zones)) {
    const idx = appData.zones.findIndex(z => z.id === id);
    if (idx >= 0) appData.zones[idx] = zone; else appData.zones.push(zone);
  }
  renderHomePage();
  if (document.getElementById('zones-zone-grid')) {
    renderZonesPage();
  }
  // Refresh zone selector
  const selector = document.getElementById('zoneSelector');
  if (selector && appData?.zones) {
    selector.innerHTML = '<option value="">All Zones</option>' + appData.zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
  }

  showNotification('Zone saved locally. Syncing with server...', 'success');

  // Try to save on server (non-blocking for UI)
  try {
    const payload = {
      name,
      description,
      address,
      lat,
      lng,
      icon,
      alerts: alerts.join(',')
    };
    const res = await fetch(`${API_BASE}/zones.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data?.success) {
      showNotification('Zone synced to server.', 'success');
    } else if (data?.error) {
      showNotification(`Server error: ${data.error}`, 'error');
    }
  } catch (err) {
    console.warn('Zones API sync failed:', err);
  }

  // Reset form
  const form = document.getElementById('zonesForm');
  if (form) form.reset();
  // Reset temp arrays and UI lists
  window._newZoneContacts = [];
  window._newZoneServices = [];
  const ecList = document.getElementById('newECList');
  const svcList = document.getElementById('newSvcList');
  if (ecList) ecList.innerHTML = '';
  if (svcList) svcList.innerHTML = '';
}

async function loadZones() {
  // Simple loader example — can be expanded to display zones from DB or localStorage
  try {
    const res = await fetch(`${API_BASE}/zones.php`);
    const zones = await res.json();
    console.log("Loaded zones:", zones);
  } catch {
    const zones = JSON.parse(localStorage.getItem("customZones") || "[]");
    console.log("Offline zones:", zones);
  }
}


// ✅ Auto-load saved zones on page load
document.addEventListener("DOMContentLoaded", () => {
    const zones = JSON.parse(localStorage.getItem("zones")) || [];
    console.log("Loaded zones:", zones);
    if (typeof renderZones === "function") {
        renderZones();
    }
});


function handleSignup(event) {
    event.preventDefault();
    const name = byId('signupName')?.value;
    const email = byId('signupEmail')?.value;
    const phone = byId('signupPhone')?.value;
    const password = byId('signupPassword')?.value;
    const zone = byId('signupZone')?.value;
    if (!(name && email && phone && password && zone)) {
        showNotification('Please fill in all fields.', 'error');
        return;
    }
    fetch(`${API_BASE}/signup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, zone })
    }).then(r => {
        if (!r.ok) {
            throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
    }).then(res => {
        if (res && res.success) {
            // Auto-login after successful signup
            isAuthenticated = true;
            localStorage.setItem('sessionUser', JSON.stringify({ 
                email: email, 
                zone: zone, 
                is_admin: false, 
                token: res.token || 'user_token_' + Date.now() 
            }));
            const adminLink = byId('adminLink');
            const logoutLink = byId('logoutLink');
            if (adminLink) adminLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'inline';
            showNotification('Account created successfully! Welcome to ZoneVault.', 'success');
            showPage('home');
        } else {
            showNotification(res?.error || 'Signup failed', 'error');
        }
    }).catch((error) => {
        console.error('Signup API error:', error);
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            showNotification('User already exists with this email.', 'error');
            return;
        }
        users.push({ name, email, phone, password, zone });
        localStorage.setItem('users', JSON.stringify(users));
        
        // Auto-login after successful local signup
        isAuthenticated = true;
        localStorage.setItem('sessionUser', JSON.stringify({ 
            email: email, 
            zone: zone, 
            is_admin: false, 
            token: 'user_token_' + Date.now() 
        }));
        const adminLink = byId('adminLink');
        const logoutLink = byId('logoutLink');
        if (adminLink) adminLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'inline';
        showNotification('Account created locally (offline mode). Welcome to ZoneVault.', 'success');
        showPage('home');
    });
}

// Contact form handler
function handleContactForm(event) {
    event.preventDefault();
    const name = byId('contactName')?.value;
    const email = byId('contactEmail')?.value;
    const phone = byId('contactPhone')?.value;
    const zone = byId('contactZone')?.value;
    const subject = byId('contactSubject')?.value;
    const message = byId('contactMessage')?.value;
    
    if (!(name && email && zone && subject && message)) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    const contactData = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
        name,
        email,
        phone,
        zone,
        subject,
        message,
        status: 'new',
        timestamp: new Date().toISOString(),
        respondedAt: null
    };
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    contacts.push(contactData);
    localStorage.setItem('contactMessages', JSON.stringify(contacts));
    
    showNotification('Thank you for your message! We will get back to you soon.', 'success');
    
    // Reset form
    event.target.reset();
    if (currentPage === 'admin') renderAdminMessages();
}

function renderAdminMessages() {
    const container = byId('adminMessages');
    if (!container) return;
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]').sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    if (!messages.length) {
        container.innerHTML = '<div class="error">No messages yet.</div>';
        return;
    }
    container.innerHTML = messages.map(m => {
        const mailto = `mailto:${m.email}?subject=${encodeURIComponent('[ZoneVault] Re: ' + m.subject)}&body=${encodeURIComponent('\n\n— Reply from Admin\n\nOriginal message:\n' + m.message)}`;
        return `
            <div class="contact-card" data-id="${m.id}">
                <h3>${m.subject} ${m.status === 'responded' ? '<span class="verified-badge">Responded</span>' : ''}</h3>
                <p><strong>From:</strong> ${m.name} &lt;${m.email}&gt; ${m.phone ? '('+m.phone+')' : ''}</p>
                <p><strong>Zone:</strong> ${m.zone}</p>
                <p><strong>Received:</strong> ${new Date(m.timestamp).toLocaleString()}</p>
                <p style="margin-top:0.5rem;">${m.message}</p>
                <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <a class="btn" href="${mailto}">Reply</a>
                    <button class="btn btn-secondary" data-action="mark" data-id="${m.id}">${m.status === 'responded' ? 'Mark New' : 'Mark Responded'}</button>
                    <button class="btn btn-secondary" data-action="delete" data-id="${m.id}">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            const list = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            const idx = list.findIndex(x => x.id === id);
            if (idx < 0) return;
            if (action === 'mark') {
                const isResp = list[idx].status === 'responded';
                list[idx].status = isResp ? 'new' : 'responded';
                list[idx].respondedAt = isResp ? null : new Date().toISOString();
            } else if (action === 'delete') {
                list.splice(idx, 1);
            }
            localStorage.setItem('contactMessages', JSON.stringify(list));
            renderAdminMessages();
        });
    });
}

// Logout function
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('sessionUser');
    localStorage.removeItem('selectedZoneId');
    const adminLink = byId('adminLink');
    const userDashLink = byId('userDashboardLink');
    const adminDashLink = byId('adminDashboardLink');
    const logoutLink = byId('logoutLink');
    if (adminLink) adminLink.style.display = 'none';
    if (userDashLink) userDashLink.style.display = 'none';
    if (adminDashLink) adminDashLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'none';
    showNotification('You have been logged out successfully.', 'success');
    showPage('login');
}

// Initialize application
async function init() {
    console.log('🚀 Initializing ZoneVault...');
    
    // Load dark mode preference
    loadDarkModePreference();
    
    // Default to login to avoid flashing Home before auth
    showPage('login');
    
    // Load data (with fallback)
    await loadData();
    // Restore selected zone
    selectedZoneId = localStorage.getItem('selectedZoneId') || '';
    // Populate zone selector
    const selector = document.getElementById('zoneSelector');
    if (selector && appData?.zones) {
        selector.innerHTML = '<option value="">All Zones</option>' + appData.zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        if (selectedZoneId) selector.value = selectedZoneId;
        selector.addEventListener('change', (e) => onSelectZone(e.target.value));
    }
    // Session
    const session = localStorage.getItem('sessionUser');
    if (session) {
        isAuthenticated = true;
        const s = JSON.parse(session);
        const adminLink = byId('adminLink');
        const userDashLink = byId('userDashboardLink');
        const adminDashLink = byId('adminDashboardLink');
        const logoutLink = byId('logoutLink');
        if (adminLink) adminLink.style.display = ADMIN_EMAILS.includes(s.email) ? 'inline' : 'none';
        if (userDashLink) userDashLink.style.display = 'inline';
        if (adminDashLink) adminDashLink.style.display = ADMIN_EMAILS.includes(s.email) ? 'inline' : 'none';
        if (logoutLink) logoutLink.style.display = 'inline';
        
        // If user is authenticated, show home page
        showPage('home');
    } else {
        // If no session, show login page
        showPage('login');
    }
    // show current selection in context bar
    renderSelectedZoneContext();
    
    // Render home page only when authenticated and on home
    if (isAuthenticated && currentPage === 'home') {
        renderHomePage();
    }
    
    console.log('✅ ZoneVault initialized successfully');
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

// Zone selection helpers
function onSelectZone(zoneId) {
    selectedZoneId = zoneId || '';
    localStorage.setItem('selectedZoneId', selectedZoneId);
    renderSelectedZoneContext();
    if (currentPage === 'alerts' && selectedZoneId) {
        const z = appData?.zones?.find(zz => zz.id === selectedZoneId);
        if (z) renderAlertsForZone(z);
    }
    if (selectedZoneId) {
        showPage(selectedZoneId);
    }
}

function renderSelectedZoneContext() {
    const bar = document.getElementById('zoneContextBar');
    const nameEl = document.getElementById('selectedZoneName');
    if (!bar || !nameEl) return;
    const zone = appData?.zones?.find(z => z.id === selectedZoneId);
    if (zone) {
        bar.style.display = 'block';
        nameEl.textContent = zone.name;
    } else {
        bar.style.display = 'none';
        nameEl.textContent = '-';
    }
}

// Handle navigation clicks
document.addEventListener('click', function(e) {
    const target = e.target.closest('.nav-link');
    if (target) {
        e.preventDefault();
        const raw = target.getAttribute('data-page') || target.textContent || '';
        const pageId = raw.toLowerCase().replace(/\s+/g, '').trim();
        if (pageId) showPage(pageId);
    }
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .dark-mode-toggle {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }
    .dark-mode-toggle:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    .offline-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f56565;
        color: white;
        padding: 0.5rem;
        text-align: center;
        z-index: 1000;
        font-size: 0.9rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .offline-indicator i {
        margin-right: 0.5rem;
    }
    .contact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
    }
    .contact-card {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .contact-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .contact-card h3 {
        color: #2d3748;
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }
    .contact-card p {
        margin: 0.5rem 0;
        color: #4a5568;
    }
    .contact-card a {
        color: #3182ce;
        text-decoration: none;
        font-weight: 500;
    }
    .contact-card a:hover {
        text-decoration: underline;
    }
    .contact-form-section {
        margin-top: 3rem;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 12px;
        border: 1px solid #e9ecef;
    }
    .contact-form-section h2 {
        color: #2d3748;
        margin-bottom: 1.5rem;
        text-align: center;
    }
    .contact-form {
        max-width: 600px;
        margin: 0 auto;
    }
    .contact-form .form-group {
        margin-bottom: 1rem;
    }
    .contact-form label {
        display: block;
        margin-bottom: 0.5rem;
        color: #2d3748;
        font-weight: 500;
    }
    .contact-form input,
    .contact-form select,
    .contact-form textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .contact-form input:focus,
    .contact-form select:focus,
    .contact-form textarea:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }
    .contact-form textarea {
        resize: vertical;
        min-height: 120px;
    }
`;
document.head.appendChild(style);