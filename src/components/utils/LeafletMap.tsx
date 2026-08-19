import { useEffect, useRef, useState } from 'react';
import { StatPin, ExclamationTriangle } from '../../utils/Icons';

interface LeafletMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  height?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function LeafletMap({
  onLocationSelect,
  initialLat = 14.5995,
  initialLng = 120.9842,
  height = '200px',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L);
  const [geocoding, setGeocoding] = useState(false);

  // Collapsible Search & Autocomplete states
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Load Leaflet CDN dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Add Leaflet CSS
    const linkId = 'leaflet-cdn-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    const scriptId = 'leaflet-cdn-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      // If script is already in head but loading, check periodically
      const interval = setInterval(() => {
        if (window.L) {
          setLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !containerRef.current) return;

    // Prevent map container double-initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const L = window.L;

    // Create Map without default zoom control (so we can place it on top-right, avoiding search overlap)
    const map = L.map(containerRef.current, {
      zoomControl: false
    }).setView([initialLat, initialLng], 13);
    mapInstanceRef.current = map;

    // Add zoom control at top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Create Initial Marker
    const marker = L.marker([initialLat, initialLng], {
      draggable: false,
    }).addTo(map);
    markerRef.current = marker;

    // Click Listener
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      
      // Update Marker position
      marker.setLatLng([lat, lng]);

      // Call Nominatim Reverse Geocoding API
      setGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'AA2000-Site-Survey-Estimation-App/1.0',
            },
          }
        );
        const data = await response.json();
        const addressText = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect(lat, lng, addressText);
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        // Fallback to coordinates string if API fails
        onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setGeocoding(false);
      }
    });

    // Fix leaflet image loading paths for standard markers
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Reactively move map view when initialLat/initialLng change (e.g., from address geocoding)
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.setView([initialLat, initialLng], 16);
    markerRef.current.setLatLng([initialLat, initialLng]);
  }, [initialLat, initialLng, leafletLoaded]);

  // Fetch search suggestions (autocomplete)
  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AA2000-Site-Survey-Estimation-App/1.0',
          },
        }
      );
      const data = await response.json();
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Handle suggestion item click
  const handleSuggestionClick = (sug: any) => {
    const lat = parseFloat(sug.lat);
    const lon = parseFloat(sug.lon);
    const addressText = sug.display_name;

    // Fly/Move Map and update Marker
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
    }

    // Trigger callback to auto-fill address
    onLocationSelect(lat, lon, addressText);

    // Clear and collapse states
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsExpanded(false);
  };

  // Handle full forward geocoding search submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: {
            'User-Agent': 'AA2000-Site-Survey-Estimation-App/1.0',
          },
        }
      );
      const results = await response.json();
      if (results && results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const addressText = result.display_name;

        // Fly/Move Map and update Marker
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
        }

        // Trigger callback to auto-fill address
        onLocationSelect(lat, lon, addressText);

        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setIsExpanded(false);
      } else {
        setSearchError('No results found');
        setTimeout(() => setSearchError(''), 3000); // Clear error after 3s
      }
    } catch (error) {
      console.error('Error forward geocoding:', error);
      setSearchError('Search failed');
      setTimeout(() => setSearchError(''), 3000);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
      {/* Invisible backdrop for suggestions click-away */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="fixed inset-0 z-[998]" 
          onClick={() => {
            setShowSuggestions(false);
            setSuggestions([]);
          }} 
        />
      )}

      {/* Collapsible Search Input & Dropdown overlay */}
      {leafletLoaded && (
        <div 
          className="absolute top-2 left-2 flex flex-col"
          style={{ zIndex: 1000 }}
          onClick={(e) => e.stopPropagation()} // Prevent map click when interacting with search input
        >
          <div className="flex items-center">
            {!isExpanded ? (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-md transition-all hover:scale-105"
                title="Search Location"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            ) : (
              <form 
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-md max-w-[280px] w-72 animate-in fade-in slide-in-from-left-2 duration-150 relative"
              >
                {/* Search Button on the Left */}
                <button
                  type="submit"
                  disabled={searching}
                  className="pl-2 pr-1 text-slate-400 hover:text-slate-600 outline-none shrink-0"
                  title="Search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={searchQuery}
                  autoFocus
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (searchError) setSearchError('');

                    // Debounce suggestions fetch
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                    }
                    debounceTimerRef.current = setTimeout(() => {
                      fetchSuggestions(val);
                    }, 400);
                  }}
                  placeholder="Search location..."
                  className="flex-1 px-1.5 py-1 text-xs outline-none bg-transparent text-slate-700 font-semibold"
                />
                {searching && (
                  <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin shrink-0 mr-1" />
                )}
                {/* Close Button on the Right */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSearchError('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Autocomplete Suggestions list */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="mt-1 w-72 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg overflow-y-auto max-h-48 flex flex-col z-[1001] animate-in fade-in duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  className="w-full text-left px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2 transition-colors"
                >
                  <StatPin className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate flex-1">{sug.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating search error badge */}
      {searchError && (
        <div 
          className="absolute top-14 left-2 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-[10px] font-black text-red-600 shadow-sm"
          style={{ zIndex: 1000 }}
        >
          <ExclamationTriangle className="w-3 h-3 inline mr-1" />{searchError}
        </div>
      )}

      {/* Map div */}
      <div 
        ref={containerRef} 
        style={{ height, width: '100%', zIndex: 1 }} 
      />

      {/* Loader overlay */}
      {(!leafletLoaded || geocoding) && (
        <div 
          className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2"
          style={{ zIndex: 2 }}
        >
          <div className="w-5 h-5 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {geocoding ? 'Fetching Address...' : 'Loading Map...'}
          </p>
        </div>
      )}
    </div>
  );
}
