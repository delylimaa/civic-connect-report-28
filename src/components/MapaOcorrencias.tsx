import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import { BadgeStatus } from "@/components/BadgeStatus";
import { FotoOcorrencia } from "@/components/FotoOcorrencia";
import { CATEGORIAS, STATUS, formatarData, type Ocorrencia , rotuloOcorrencia } from "@/lib/ocorrencias";

function pino(cor: string) {
  return L.divIcon({
    className: "",
    html: `<span class="pino-status" style="display:block;width:20px;height:20px;background:${cor}"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function MapaOcorrencias({ ocorrencias }: { ocorrencias: Ocorrencia[] }) {
  const comLocal = ocorrencias.filter((o) => o.latitude != null && o.longitude != null);
  const primeiro = comLocal[0];
  const centro: [number, number] = primeiro
    ? [primeiro.latitude as number, primeiro.longitude as number]
    : [-23.5505, -46.6333];

  return (
    <MapContainer
      center={centro}
      zoom={comLocal.length ? 13 : 11}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
        {comLocal.map((o) => (
          <Marker
            key={o.id}
            position={[o.latitude as number, o.longitude as number]}
            icon={pino(STATUS[o.status].cor)}
          >
            <Popup>
              <div className="w-56 space-y-2">
                <FotoOcorrencia
                  caminho={o.foto_url}
                  alt={`Foto do chamado ${o.titulo}`}
                  className="h-28 w-full rounded-lg"
                />
                <p className="text-sm font-semibold text-foreground">{o.titulo}</p>
                <p className="text-xs text-muted-foreground">{rotuloOcorrencia(o)}</p>
                {o.descricao ? (
                  <p className="text-xs text-foreground">{o.descricao}</p>
                ) : null}
                <BadgeStatus status={o.status} />
                <p className="text-xs text-muted-foreground">{formatarData(o.criado_em)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
