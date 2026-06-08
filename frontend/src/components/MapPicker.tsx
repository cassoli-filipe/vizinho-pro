import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

// Redefinir o ícone do marcador padrão para evitar bugs do Vite com arquivos estáticos
const customIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  iconAnchor: [10, 24], // Ancorado na base inferior do pin
  popupAnchor: [0, -24],
  html: `
    <div style="
      background-color: #0046C0;
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    ">
      <div style="
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
  `
});

interface MapPickerProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

// Componente auxiliar para capturar eventos de clique e arrasto no mapa
const MapEventsHelper: React.FC<{ 
  onMapClick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}> = ({ onMapClick, readOnly }) => {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

export const MapPicker: React.FC<MapPickerProps> = ({
  lat,
  lng,
  radiusKm,
  onChange,
  readOnly = false
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // Mover o centro do mapa quando as coordenadas mudarem externamente
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  const handleMarkerDrag = (e: L.DragEndEvent) => {
    if (readOnly) return;
    const marker = e.target;
    const position = marker.getLatLng();
    onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
  };

  const handleMapClick = (clickLat: number, clickLng: number) => {
    onChange(Number(clickLat.toFixed(6)), Number(clickLng.toFixed(6)));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada por este navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onChange(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
      },
      (error) => {
        console.error('Erro ao obter geolocalização:', error);
        alert('Não foi possível obter a sua localização atual. Verifique se a permissão de geolocalização foi concedida nas configurações do seu navegador.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div style={styles.container}>
      <div style={{ position: 'relative', width: '100%', height: '320px' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={13}
          style={styles.map}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={mapRef as any}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEventsHelper onMapClick={handleMapClick} readOnly={readOnly} />

          <Marker
            position={[lat, lng]}
            icon={customIcon}
            draggable={!readOnly}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          />

          {/* Círculo que desenha o raio de cobertura em metros */}
          <Circle
            center={[lat, lng]}
            radius={radiusKm * 1000} // metros
            pathOptions={{
              color: '#0046C0',
              fillColor: '#0046C0',
              fillOpacity: 0.15,
              weight: 2
            }}
          />
        </MapContainer>

        {!readOnly && (
          <button 
            type="button" 
            onClick={handleUseMyLocation} 
            style={styles.useMyLocationBtn}
            title="Usar minha localização atual"
          >
            <Navigation size={14} color="#0046C0" />
            <span>Minha Localização</span>
          </button>
        )}
      </div>
      
      {!readOnly && (
        <div style={styles.instructions}>
          <span style={styles.instructionsText}>
            💡 <strong>Dica de UX:</strong> Arraste o marcador azul ou clique em qualquer ponto do mapa para reposicionar a área de cobertura do serviço.
          </span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  map: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  instructions: {
    backgroundColor: '#F8FAFC',
    padding: '10px 14px',
    borderTop: '1px solid var(--border-color)',
  },
  instructionsText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  useMyLocationBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0F172A',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s',
  }
};
