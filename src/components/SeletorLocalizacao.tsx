import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const icone = L.divIcon({
  className: "",
  html: `<span class="pino-status" style="display:block;width:22px;height:22px;background:oklch(0.46 0.125 249)"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Centralizar({ posicao }: { posicao: [number, number] }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView(posicao, mapa.getZoom());
  }, [mapa, posicao[0], posicao[1]]);
  return null;
}

function CapturaClique({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (evento) => onChange(evento.latlng.lat, evento.latlng.lng),
  });
  return null;
}

export default function SeletorLocalizacao({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const posicao: [number, number] = [latitude, longitude];

  return (
    <MapContainer center={posicao} zoom={16} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Centralizar posicao={posicao} />
      <CapturaClique onChange={onChange} />
      <Marker
        position={posicao}
        icon={icone}
        draggable
        eventHandlers={{
          dragend: (evento) => {
            const { lat, lng } = evento.target.getLatLng();
            onChange(lat, lng);
          },
        }}
      />
    </MapContainer>
  );
}
