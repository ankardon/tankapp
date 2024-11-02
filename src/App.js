/* eslint-disable react/prop-types */
import "leaflet/dist/leaflet.css";
import React, { useEffect, useState, useRef } from "react";
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

function SelectableMarker({ entry, isSelected, setSelectedId }) {
  return entry === null || entry.latlng === null ? null : (
    <Marker
      position={entry.latlng}
      eventHandlers={{
        click: () => {
          setSelectedId(entry.id);
        },
      }}
      key={entry.id}
      riseOnHover={true}
      zIndexOffset={isSelected ? 100 : 1}
      icon={isSelected ? selectedIcon : unselectedIcon}
    />
  );
}

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
    .map((entry) => entry.latlng)
    .reduce(
      ([minLat, minLng, maxLat, maxLng], [currentLat, currentLng]) => {
        return [
          Math.min(minLat, currentLat),
          Math.min(minLng, currentLng),
          Math.max(maxLat, currentLat),
          Math.max(maxLng, currentLng),
        ];
      },
      // starting values that are definately outside of regular lat lng coords
      // => they will be rpelaced by any possible valid coord
      [1000, 1000, -1000, -1000], 
    );

  const markers = preprocessedData.map((entry) => {
    const isSelected = entry.id === selectedId;
    return (
      <SelectableMarker
        entry={entry}
        key={entry.id}
        isSelected={isSelected}
        setSelectedId={setSelectedId}
      />
    );
  });

  // display loading indicator in case the data is not yet available
  if (data === null) {
    return (
      <div
        role="status"
        className="flex w-screen h-screen items-center justify-center"
      >
        <svg
          aria-hidden="true"
          className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="flex flex-col h-1/3 md:h-screen md:w-1/3 p-2">
        <input
          className="w-full mb-1 "
          type="text"
          value={query}
          placeholder="Suche nach einer Adresse"
          onChange={(e) => {
            setQuery(e.target.value);
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
        className="md:w-2/3 md:h-screen h-2/3"
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
