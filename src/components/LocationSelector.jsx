import { LocateFixed, MapPin } from "lucide-react";
import { pharmacies } from "../data/pharmacies";

const uniqueValues = (items, key) => [...new Set(items.map((item) => item[key]))];

export default function LocationSelector({ value, onChange, onLocate, locating, locationMessage, showLocate = true }) {
  const governorates = uniqueValues(pharmacies.filter((item) => item.isActive), "governorate");
  const cities = uniqueValues(pharmacies.filter(
    (item) => item.isActive && item.governorate === value.governorate,
  ), "city");
  const areas = uniqueValues(pharmacies.filter(
    (item) => item.isActive && item.governorate === value.governorate && item.city === value.city,
  ), "area");

  function update(field, nextValue) {
    if (field === "governorate") onChange({ governorate: nextValue, city: "", area: "" });
    if (field === "city") onChange({ ...value, city: nextValue, area: "" });
    if (field === "area") onChange({ ...value, area: nextValue });
  }

  return (
    <div className="pharmacy-location-tools">
      <div className="pharmacy-location-fields">
        <label>
          <span>المحافظة</span>
          <select value={value.governorate} onChange={(event) => update("governorate", event.target.value)}>
            <option value="">كل المحافظات</option>
            {governorates.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>المدينة أو المركز</span>
          <select value={value.city} onChange={(event) => update("city", event.target.value)} disabled={!value.governorate}>
            <option value="">كل المدن</option>
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>المنطقة</span>
          <select value={value.area} onChange={(event) => update("area", event.target.value)} disabled={!value.city}>
            <option value="">كل المناطق</option>
            {areas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {showLocate && (
        <button className="pharmacy-locate-button" type="button" onClick={onLocate} disabled={locating}>
          <LocateFixed size={17} />
          {locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي"}
        </button>
      )}
      {locationMessage && <p className="pharmacy-location-message" role="status"><MapPin size={14} />{locationMessage}</p>}
    </div>
  );
}