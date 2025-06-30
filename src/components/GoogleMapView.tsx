import React from 'react';
import { MapPin, ExternalLink, Navigation, Shield, Target } from 'lucide-react';

interface GoogleMapViewProps {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  userName: string;
  accuracy?: number;
  source?: string;
}

const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  latitude,
  longitude,
  address,
  city,
  country,
  userName,
  accuracy,
  source
}) => {
  // Create Google Maps URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;

  // Check if coordinates are valid
  const hasValidCoordinates = latitude !== 0 && longitude !== 0;

  // Get location source display info
  const getSourceInfo = () => {
    switch (source) {
      case 'GPS':
        return {
          label: 'GPS Location',
          description: 'Precise location from device GPS',
          icon: <Target className="w-4 h-4 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'IP':
        return {
          label: 'IP Location',
          description: 'Approximate location from IP address',
          icon: <MapPin className="w-4 h-4 text-blue-600" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          label: 'Unknown Source',
          description: 'Location source not available',
          icon: <Shield className="w-4 h-4 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const sourceInfo = getSourceInfo();

  return (
    <div className="space-y-4">
      {/* Location Information */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">
              {userName}'s Login Location
            </h4>
            <p className="text-sm text-gray-600 mb-2">{address}</p>
            <p className="text-xs text-gray-500">
              IP-based coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </div>
      </div>

      {/* Location Source and Accuracy */}
      <div className={`${sourceInfo.bgColor} ${sourceInfo.borderColor} border rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {sourceInfo.icon}
            <div>
              <h5 className={`font-medium ${sourceInfo.color}`}>
                {sourceInfo.label}
              </h5>
              <p className="text-sm text-gray-600">
                {sourceInfo.description}
              </p>
            </div>
          </div>
          {accuracy && source === 'GPS' && (
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                ±{accuracy.toFixed(0)}m
              </div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
          )}
        </div>
      </div>

      {/* Map Actions */}
      {hasValidCoordinates && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View on Maps</span>
          </a>
          
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Navigation className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Get Directions</span>
          </a>
          
          <a
            href={streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Street View</span>
          </a>
        </div>
      )}

      {/* Map Preview */}
      {hasValidCoordinates ? (
        <div className="bg-gray-100 rounded-lg p-4 h-96">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-md max-w-md">
                <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h5 className="font-medium text-gray-900 mb-2">Interactive Map</h5>
                <p className="text-sm text-gray-600 mb-4">
                  Click the buttons above to view this location on Google Maps with full interactivity.
                </p>
                <div className="space-y-2 text-xs text-gray-500">
                  <p><strong>Latitude:</strong> {latitude.toFixed(6)}</p>
                  <p><strong>Longitude:</strong> {longitude.toFixed(6)}</p>
                  <p><strong>Location:</strong> {city}, {country}</p>
                  {accuracy && source === 'GPS' && (
                    <p><strong>Accuracy:</strong> ±{accuracy.toFixed(0)} meters</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-4 h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Location data not available</p>
            <p className="text-sm text-gray-500">
              This login session was recorded without location information.
            </p>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Location Details</h5>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">City:</span>
            <span className="ml-2 font-medium">{city || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-gray-600">Country:</span>
            <span className="ml-2 font-medium">{country || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-gray-600">Latitude:</span>
            <span className="ml-2 font-medium">{latitude.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-600">Longitude:</span>
            <span className="ml-2 font-medium">{longitude.toFixed(6)}</span>
          </div>
          {accuracy && source === 'GPS' && (
            <div>
              <span className="text-gray-600">Accuracy:</span>
              <span className="ml-2 font-medium">±{accuracy.toFixed(0)} meters</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Source:</span>
            <span className="ml-2 font-medium">{sourceInfo.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapView; 