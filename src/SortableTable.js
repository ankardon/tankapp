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
    let conditional_width;
    switch (key) {
      case "street":
        conditional_width = "w-1/2"
        break;
      case "zip":
        conditional_width = "w-1/6"
        break;
      case "area":
        conditional_width = "w-2/6"
        break;
                    
      default:
        break;
    }
    if (key === "street"){
    }
    return (
      <th
        className={`sticky top-0 py-3 bg-white text-left ${conditional_width}`}
        onClick={(e) => {
          setSorting({
            key: key,
            asc: (sorting.key === key) && !sorting.asc,
          });
        }}
      >
        {`${keyMappings[key].label}${computeSortingIndicator(key)}`}
      </th>
    );
  });

  const rows = preprocessedData.map((entry) => {
    const elements = Object.keys(keyMappings).map((key) => {
      return <td className="text-left"> {entry[key]}</td>;
    });
    const isSelected = entry.id === selectedId;
    if (isSelected) {
      return (
        <tr
        className="bg-black text-white"
          ref={(ref) => {
            // this uses the ref solely as a way to scroll the selected row into view just at the instance of its selection.
            if (ref !== null){
              ref.scrollIntoView({ behavior: "smooth", block: "nearest"});

              // ugly hack, as the table header is sticky, scrollIntoView treats it like a floating row and scrolls rows which are above the current viewport of the container
              // such, that while they are inside the viewport of the container, they are still behind the sticky table header. 
              if (ref.getBoundingClientRect().y < 50){
                containerRef.current.scrollBy({top:-50})
              };
            }
          
          }}
          onClick={() => setSelectedId(entry.id)}
        >
          {elements}
        </tr>
      );
    }
    return (
      <tr onClick={() => setSelectedId(entry.id)}>
        {elements}
      </tr>
    );
  });

  return (
    <div ref={containerRef} className="flex-grow overflow-auto">
      <table className="border-spacing-0 w-full content table-fixed">
        <thead >
          {tableHeaders}
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
