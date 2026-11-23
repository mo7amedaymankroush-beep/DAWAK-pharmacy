import React, { useEffect, useRef, useState } from "react";

import {
  searchDrugs,
  getAlternatives
} from "../api/mockApi";
import { getPharmaciesForProduct } from "../api/pharmaciesApi";

import DrugResult from "./DrugResult";
import PharmacyLocationDialog from "./PharmacyLocationDialog";
import "./search.css";

const LOCATION_CHOICE_KEY = "dawak-pharmacy-location-choice";

function readLocationChoice() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LOCATION_CHOICE_KEY) || "null");
    return saved?.mode ? saved : null;
  } catch {
    return null;
  }
}

export default function SearchSection({ query = "", onQueryChange, onAddToCart, onQuickOrder, initialLocation }) {
  const [q, setQ] = useState(query);

  // النص مشترك مع شريط بحث الهيدر
  useEffect(() => {
    setQ(query);
  }, [query]);

  function updateQuery(value) {
    setQ(value);
    onQueryChange?.(value);
  }
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [locationChoice, setLocationChoice] = useState(readLocationChoice);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState("distance");
  const [showOtherPharmacies, setShowOtherPharmacies] = useState(false);
  const [pharmacyRefresh, setPharmacyRefresh] = useState(0);
  const [pharmacyResults, setPharmacyResults] = useState([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState("");

  // منع تداخل طلبات البحث
  const requestId = useRef(0);
  const pharmacyRequestId = useRef(0);

  useEffect(() => {
    if (!locationChoice || !selected) return undefined;

    let active = true;
    const currentRequest = ++pharmacyRequestId.current;
    setPharmacyLoading(true);
    setPharmacyError("");
    const filters = locationChoice.mode === "manual" && !showOtherPharmacies ? locationChoice : {};
    getPharmaciesForProduct(selected.id, filters, { includeUnavailable: true })
      .then((results) => {
        if (!active || currentRequest !== pharmacyRequestId.current) return;
        const withDistance = results.map((pharmacy) => ({
          ...pharmacy,
          distanceMeters: locationChoice.mode === "gps" && Number.isFinite(pharmacy.latitude) && Number.isFinite(pharmacy.longitude)
            ? distanceBetween(locationChoice.latitude, locationChoice.longitude, pharmacy.latitude, pharmacy.longitude)
            : null,
        }));
        setPharmacyResults(withDistance);
      })
      .catch(() => {
        if (active && currentRequest === pharmacyRequestId.current) setPharmacyError("تعذر تحميل الصيدليات المتاح بها المنتج.");
      })
      .finally(() => {
        if (active && currentRequest === pharmacyRequestId.current) setPharmacyLoading(false);
      });

    return () => { active = false; };
  }, [locationChoice, selected?.id, pharmacyRefresh, showOtherPharmacies]);

  // البحث أثناء الكتابة
  useEffect(() => {
    if (selected) return;

    const keyword = q.trim();

    if (!keyword) {
      setSuggestions([]);
      setSearching(false);
      setError("");
      return;
    }

    let cancelled = false;

    setSearching(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const list = await searchDrugs(keyword);

        if (!cancelled) {
          setSuggestions(Array.isArray(list) ? list : []);
          setShowAll(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setError("حدث خطأ أثناء البحث، حاول مرة أخرى.");
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };

  }, [q, selected]);

  // اختيار الدواء وعرض تفاصيله
  async function pick(drug) {
    const currentRequest = ++requestId.current;

    setSelected(drug);
    updateQuery(drug.name);
    setSuggestions([]);
    setShowAll(false);
    setResult(null);
    setError("");
    setLocationDialogOpen(!locationChoice);
    setShowOtherPharmacies(false);
    setPharmacyResults([]);
    setPharmacyError("");
    setLoading(true);

    try {
      const alt = await getAlternatives(drug.id);

      // تجاهل أي نتيجة قديمة
      if (currentRequest !== requestId.current) return;

      setResult({
        alt
      });

    } catch (err) {
      if (currentRequest === requestId.current) {
        setError("تعذر تحميل تفاصيل الدواء، حاول مرة أخرى.");
      }

    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }

  // تغيير نص البحث
  function onChange(e) {
    requestId.current++;

    updateQuery(e.target.value);
    setSelected(null);
    setResult(null);
    setSuggestions([]);
    setShowAll(false);
    setPharmacyResults([]);
    setLoading(false);
    setError("");
  }

  // تنفيذ البحث بزر أو Enter
  async function handleSearch() {
    const keyword = q.trim();
    if (!keyword || loading) return;

    if (suggestions.length > 0) {
      pick(suggestions[0]);
      return;
    }

    const currentRequest = ++requestId.current;
    setSearching(true);
    setError("");
    setResult(null);

    try {
      const list = await searchDrugs(keyword);
      if (currentRequest !== requestId.current) return;

      setSuggestions(Array.isArray(list) ? list : []);
      if (list.length > 0) {
        pick(list[0]);
      }
    } catch {
      if (currentRequest === requestId.current) {
        setSuggestions([]);
        setError("حدث خطأ أثناء البحث، حاول مرة أخرى.");
      }
    } finally {
      if (currentRequest === requestId.current) {
        setSearching(false);
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  function chooseLocation(value) {
    setLocationChoice(value);
    setShowOtherPharmacies(false);
    try {
      sessionStorage.setItem(LOCATION_CHOICE_KEY, JSON.stringify(value));
    } catch {
      // The selected location remains available in component state for this visit.
    }
    setLocationDialogOpen(false);
  }

  function sortedPharmacies() {
    return [...pharmacyResults].sort((first, second) => {
      if (sortBy === "price") return first.price - second.price;
      if (locationChoice?.mode === "gps") {
        if (first.distanceMeters == null && second.distanceMeters == null) return 0;
        if (first.distanceMeters == null) return 1;
        if (second.distanceMeters == null) return -1;
        return first.distanceMeters - second.distanceMeters;
      }
      return 0;
    });
  }

  // أول 5 اقتراحات
  const visibleSuggestions = showAll
    ? suggestions
    : suggestions.slice(0, 5);

  return (
    <div className="dw-search">

      {/* Search Input */}
      <div className="dw-input-row">

        <input
          type="text"
          value={q}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="اكتب اسم الدواء أو المنتج..."
          aria-label="ابحث عن دواء أو منتج"
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || searching || !q.trim()}
        >
          ابحث
        </button>

      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (

        <div className="dw-suggestions-container">

          <ul className="dw-suggest">

            {visibleSuggestions.map((drug) => (

              <li
                key={drug.id}
                onClick={() => pick(drug)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") pick(drug);
                }}
              >

                <b>{drug.name}</b>

                <span>
                  {drug.activeIngredient} · {drug.strength} · {drug.form}
                </span>

              </li>

            ))}

          </ul>

          {/* Show More */}
          {suggestions.length > 5 && (

            <button
              type="button"
              className="dw-show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "عرض أقل" : "عرض المزيد"}
            </button>

          )}

        </div>

      )}

      {/* Loading Search */}
      {searching && (
        <p className="dw-sub">
          جاري البحث عن الدواء...
        </p>
      )}

      {/* No Results */}
      {!searching &&
        q.trim() &&
        !selected &&
        suggestions.length === 0 &&
        !error && (

          <p className="dw-sub">
            لم يتم العثور على نتائج مطابقة.
          </p>

        )}

      {/* Selected Drug Loading */}
      {loading && (
        <p className="dw-sub">
          جاري تحميل تفاصيل الدواء والصيدليات...
        </p>
      )}

      {/* Errors */}
      {error && (
        <p className="dw-error">
          {error}
        </p>
      )}

      {/* Drug Details */}
      {result && selected && (
        <>
          <DrugResult
            drug={selected}
            onAddToCart={onAddToCart}
            onQuickOrder={onQuickOrder}
            {...result}
            pharmacies={sortedPharmacies()}
            pharmacyLoading={pharmacyLoading}
            pharmacyError={pharmacyError}
            locationChoice={locationChoice}
            onChangeLocation={() => setLocationDialogOpen(true)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onRetryPharmacies={() => setPharmacyRefresh((value) => value + 1)}
            onShowOtherPharmacies={() => setShowOtherPharmacies((current) => !current)}
            showingOtherPharmacies={showOtherPharmacies}
          />
          {locationDialogOpen && (
            <PharmacyLocationDialog
              initialLocation={locationChoice?.mode === "manual" ? locationChoice : initialLocation}
              onChoose={chooseLocation}
              onClose={() => {
                setLocationDialogOpen(false);
                if (!locationChoice) chooseLocation({ mode: "all" });
              }}
            />
          )}
        </>
      )}

    </div>
  );
}

function distanceBetween(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const arc = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB))
    * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}