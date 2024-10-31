import logo from "./logo.svg";
import "leaflet/dist/leaflet.css";

import { useEffect, useState, useRef } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import * as L from "leaflet";
import SortableTable from "./SortableTable";

// Icons for the markers
const unselectedIcon = L.icon({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconAnchor: [12, 40],
});

const selectedIcon = L.icon({
  iconUrl: require("./marker-icon_selected.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconAnchor: [12, 40],
});

function App() {
  const [query, setQuery] = useState("");
  const [data, setData] = useLocalStorage("cologne_gas_stations", null);
  const [selectedId, _setSelectedId] = useState(-1);

  const [sorting, setSorting] = useState({ key: "street", asc: false });

  // keyMappings, mapping the column keys relevant for sorting and extraction from the raw data to theri labels and extraction fucntion
  // TODO use something like i18n in case more languages are expected
  //! NOTE: If the string contains a space withing the area name, the extraction will fail
  const keyMappings = {
    street: {
      label: "Straße",
      extract: (str) => {
        return str.split("(")[0].slice(0, -1);
      },
    },
    zip: {
      label: "PLZ",
      extract: (str) => {
        return str.split("(")[1].split(" ")[0];
      },
    },
    area: {
      label: "Gebiet",
      extract: (str) => {
        return str.split("(")[1].split(" ")[1].slice(0, -1);
      },
    },
  };

  const mapRef = useRef(null);

  // Fetch on mount
  // !Note: currently fetching is done once One could argue that, while this data won't change frequently, it still can change
  // !      a better approach would be to also store the date of collection and refetch stale data. The best approach would be
  // !      to make use of the etag provided by the server. However, I ran into difficulties with CORS when setting the If-None-Match header.
  useEffect(() => {
    if (data !== null) {
      return;
    }

    const fetchData = async () => {
      const source =
        "https://geoportal.stadt-koeln.de/arcgis/rest/services/verkehr/gefahrgutstrecken/MapServer/0/query?where=objectid+is+not+null&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=4326&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson";
      const res = await fetch(source);
      const json = await res.json();

      setData(json);
    };

    fetchData().catch((err) => {
      console.log(err);
    });
  }, []);

  // filter based on the query input by the user
  const filteredData =
    (data &&
      data.features.filter((entry) =>
        entry.attributes.adresse.toLowerCase().includes(query.toLowerCase()),
      )) ||
    [];

  // map the remaining data to a formater that's a little easier to handle for us
  const preprocessedData = filteredData
    .map((entry) => {
      const { y: lat, x: lng } = entry.geometry;

      const out = {
        id: entry.attributes.objectid,
        latlng: [lat, lng],
      };

      Object.keys(keyMappings).forEach((key) => {
        out[key] = keyMappings[key].extract(entry.attributes.adresse);
      });
      return out;
    })
    .sort(function (a, b) {
      const factor = sorting.asc ? -1 : 1;
      return a[sorting.key].localeCompare(b[sorting.key]) * factor;
    });

  // setting the selectId should also trigger the animartion flying to the selected marker.
  // this could also be handled in an effect, but this works just  as well
  const setSelectedId = (id) => {
    _setSelectedId(id);
    const selectedEntry = preprocessedData.filter(
      (entry) => entry.id === id,
    )[0];
    mapRef && mapRef.current.flyTo(selectedEntry.latlng);
  };

  // This outputs the sorting indicator depending on the given key and the current sorting selection

  const GLOBAL_BOUNDS = preprocessedData
    .map((obj) => obj.latlng)
    .reduce(
      ([minLat, minLng, maxLat, maxLng], [currentLat, currentLng]) => {
        return [
          Math.min(minLat, currentLat),
          Math.min(minLng, currentLng),
          Math.max(maxLat, currentLat),
          Math.max(maxLng, currentLng),
        ];
      },
      [1000, 1000, -1000, -1000],
    );

  const markers = preprocessedData.map((obj) => {
    const isSelected = obj.id === selectedId;
    return (
      <Marker
        id={obj.id}
        eventHandlers={{
          click: (e) => {
            setSelectedId(obj.id);
          },
        }}
        position={obj.latlng}
        key={obj.id}
        riseOnHover={true}
        zIndexOffset={isSelected?100:1}
        icon={isSelected ? selectedIcon : unselectedIcon}
      />
    );
  });

  // TODO: This layout isn't optimized for mobile yet. Consider a vertical arrangement for mobile devices.

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignContent: "flex-start",
          justifySelf: "start",
          minWidth: "450px",
        }}
      >
        <input
          type="text"
          value={query}
          placeholder="Suche nach einer Adresse"
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          style={{
            position: "sticky",
            height: "25px",
            top: 0,
            borderRadius: 6,
            zIndex: 2,
          }}
        />
        <SortableTable
          keyMappings={keyMappings}
          sorting={sorting}
          setSorting={setSorting}
          preprocessedData={preprocessedData}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      </div>
      <MapContainer
        style={{ flex: 1 }}
        maxBoundsViscosity={0.5}
        minZoom={10}
        zoomSnap={0.1}
        ref={(ref) => {
          if (ref !== null) {
            if (mapRef.current !== ref) {
              const epsilon = 0.01; // small epsilon, as the markers tip points to the position, cutting of most of the marker at the top edge
              ref.fitBounds([
                [GLOBAL_BOUNDS[0] - epsilon, GLOBAL_BOUNDS[1] - epsilon],
                [GLOBAL_BOUNDS[2] + epsilon, GLOBAL_BOUNDS[3] + epsilon],
              ]);
              mapRef.current = ref;
            }
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers}
      </MapContainer>
    </div>
  );
}

export default App;
