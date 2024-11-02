/* eslint-disable react/prop-types */
import React from 'react';
import { Marker } from "react-leaflet";
import { icon } from "leaflet";

// Icons for the markers
const unselectedIcon = icon({
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    iconAnchor: [12, 40],
});

const selectedIcon = icon({
    iconUrl: require("./marker-icon_selected.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    iconAnchor: [12, 40],
});

export default function SelectableMarker({ entry, isSelected, setSelectedId }) {
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
