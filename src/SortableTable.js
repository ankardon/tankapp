import { useRef } from "react";

export default function SortableTable({
  keyMappings,
  sorting,
  setSorting,
  preprocessedData,
  selectedId,
  setSelectedId,
}) {
  const containerRef = useRef(null);
  const computeSortingIndicator = (key) => {
    if (key === sorting.key) {
      if (sorting.asc) {
        return "↓";
      } else {
        return "↑";
      }
    } else {
      return "";
    }
  };

  const tableHeaders = Object.keys(keyMappings).map((key) => {
    return (
      <th
        style={{ textAlign: "left", borderTop: 0, position: "sticky" }}
        onClick={(e) => {
          setSorting({
            key: key,
            asc: (sorting.key === key) & !sorting.asc,
          });
        }}
      >
        {`${keyMappings[key].label}${computeSortingIndicator(key)}`}
      </th>
    );
  });

  const rows = preprocessedData.map((entry) => {
    const elements = Object.keys(keyMappings).map((key) => {
      return <td style={{ textAlign: "left" }}> {entry[key]}</td>;
    });
    const isSelected = entry.id === selectedId;
    if (isSelected) {
      return (
        <tr
          ref={(ref) => {
            // this uses the ref solely as a way to scroll the selected row into view just at the instance of its selection.
            if (ref !== null){
              ref.scrollIntoView({ behavior: "smooth", block: "nearest"});

              // ugly hack, as the table header is sticky, scrollIntoView treats it like a floating row and scrolls rows which are above the current viewport of the container
              // such, that while they are inside the viewport of the container, they are still behind the sticky table header. 
              if (ref.getBoundingClientRect().y < 55){
                containerRef.current.scrollBy({top:-25})
              };
            }
          
          }}
          onClick={() => setSelectedId(entry.id)}
          style={{ color: "white", backgroundColor: "black" }}
        >
          {elements}
        </tr>
      );
    }
    return (
      <tr onClick={() => setSelectedId(entry.id)} style={{}}>
        {elements}
      </tr>
    );
  });

  return (
    <div ref={containerRef} style={{ overflowY: "scroll" }}>
      {/* This is a workaround to prevent the table from appearing behind the sticky header */}
      <div
        style={{
          position: "absolute",
          height: "50px",
          width: "100%",
          top: 0,
          zIndex: 1,
          backgroundColor: "white",
        }}
      ></div>
      <table>
        <thead
          style={{
            position: "sticky",
            top: "2px",
            backgroundColor: "white",
            zIndex: 2,
          }}
        >
          {tableHeaders}
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
