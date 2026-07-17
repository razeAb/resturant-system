import React, { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useLang } from "../../context/LangContext";

// Leaflet's Icon.Default prepends an auto-detected imagePath to whatever URL is in
// options, which mangles Vite's bundled asset URLs. Deleting the override falls back
// to the base Icon._getIconUrl, which just returns the option value as-is.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [32.0853, 34.7818]; // Tel Aviv-ish fallback until a real pin is set

function DraggableMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onChange([lat, lng]);
        },
      }}
    />
  );
}

const DeliveryAddressPicker = ({ value, onChange }) => {
  const { t } = useLang();
  const [position, setPosition] = useState(value?.lat && value?.lng ? [value.lat, value.lng] : DEFAULT_CENTER);
  const [text, setText] = useState(value?.text || "");
  const [notes, setNotes] = useState(value?.notes || "");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  // Syncs the pin when `value` is updated from outside (e.g. the admin "resolve
  // Google Maps link" flow), not just from user interaction with this component.
  useEffect(() => {
    if (Number.isFinite(value?.lat) && Number.isFinite(value?.lng)) {
      setPosition((prev) => (prev[0] === value.lat && prev[1] === value.lng ? prev : [value.lat, value.lng]));
    }
    if (typeof value?.text === "string") {
      setText((prev) => (prev === value.text ? prev : value.text));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, value?.text]);

  const emit = useCallback(
    (nextPosition, nextText, nextNotes) => {
      onChange({ lat: nextPosition[0], lng: nextPosition[1], text: nextText, notes: nextNotes });
    },
    [onChange]
  );

  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
    emit(newPosition, text, notes);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    emit(position, e.target.value, notes);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    emit(position, text, e.target.value);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError(t("cartPage.geoNotSupported", "המכשיר לא תומך באיתור מיקום"));
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPosition);
        emit(newPosition, text, notes);
        setLocating(false);
      },
      () => {
        setLocateError(t("cartPage.geoDenied", "לא ניתן היה לאתר את המיקום שלך"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ marginTop: "14px", direction: "rtl" }}>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        style={{
          padding: "8px 16px",
          border: "2px solid #f97316",
          color: "#f97316",
          background: "transparent",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: locating ? "wait" : "pointer",
          marginBottom: "10px",
        }}
      >
        📍 {locating ? t("cartPage.locating", "מאתר מיקום...") : t("cartPage.useMyLocation", "השתמש במיקום שלי")}
      </button>
      {locateError && <p style={{ color: "#dc2626", fontSize: "13px" }}>{locateError}</p>}

      <div style={{ height: "220px", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" }}>
        <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker position={position} onChange={handlePositionChange} />
          <RecenterOnChange position={position} />
        </MapContainer>
      </div>
      <p style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
        {t("cartPage.dragPinHint", "ניתן לגרור את הסיכה או ללחוץ על המפה כדי לכוון את מיקום המשלוח")}
      </p>

      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder={t("cartPage.addressPlaceholder", "כתובת (רחוב, מספר בית, עיר)")}
        style={{ width: "100%", padding: "10px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
      />
      <input
        type="text"
        value={notes}
        onChange={handleNotesChange}
        placeholder={t("cartPage.addressNotesPlaceholder", "הערות למשלוח (קומה, כניסה, קוד שער)")}
        style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "8px", border: "1px solid #ccc" }}
      />
    </div>
  );
};

// Keeps the map view centered when position is set programmatically (e.g. "use my location")
function RecenterOnChange({ position }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(position, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);
  return null;
}

export default DeliveryAddressPicker;
