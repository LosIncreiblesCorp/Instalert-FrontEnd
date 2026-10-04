<template>
  <div class="map-container" ref="mapElement"></div>
</template>

<script setup>
/** Mapbox map rendering risk zones, incidents and businesses. */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const props = defineProps({
  riskZones: {
    type: Array,
    required: true
  },
  incidents: {
    type: Array,
    required: true
  },
  businesses: {
    type: Array,
    required: true
  },
  selectedItemId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['zone-selected', 'incident-selected', 'business-selected']);
const mapElement = ref(null);
let map = null;
let markers = [];

/** Initializes the Mapbox map centered on Lima.
* @returns {void} No return value. */
const initMap = () => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;
  map = new mapboxgl.Map({
    container: mapElement.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-77.0428, -12.0464], 
    zoom: 13
  });

  map.on('load', () => {
    drawMapData();
  });
};

/** Removes markers, zone sources and layers from the map.
* @returns {void} No return value. */
const clearMapData = () => {
  markers.forEach(m => m.marker.remove());
  markers = [];

  if (!map) return;
  props.riskZones.forEach(zone => {
    const sourceId = `zone-source-${zone.id}`;
    const fillLayerId = `zone-fill-layer-${zone.id}`;
    const lineLayerId = `zone-line-layer-${zone.id}`;
    
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
};

/** Draws zones, incident and business markers on the map.
* @returns {void} No return value. */
const drawMapData = () => {
  if (!map || !map.isStyleLoaded()) return;
  
  clearMapData();

  // Draw Risk Zones (Rectangles using bounds)
  props.riskZones.forEach(zone => {
    const sourceId = `zone-source-${zone.id}`;
    const fillLayerId = `zone-fill-layer-${zone.id}`;
    const lineLayerId = `zone-line-layer-${zone.id}`;
    
    let color = '#10b981'; // low (green)
    if (zone.riskLevel === 'medium') color = '#f59e0b';
    else if (zone.riskLevel === 'high') color = '#ef4444';

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [zone.bounds] // Already an array of [lng, lat] forming a closed shape
        }
      }
    });

    // Fill layer (visible only when zoomed in)
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      minzoom: 14,
      paint: {
        'fill-color': color,
        'fill-opacity': 0.15
      }
    });

    // Line layer (border)
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      minzoom: 14,
      paint: {
        'line-color': color,
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });

    map.on('click', fillLayerId, () => {
      emit('zone-selected', zone.id);
    });

    map.on('mouseenter', fillLayerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', fillLayerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });

  // Draw Incidents (Markers)
  props.incidents.forEach(incident => {
    // We create a custom HTML element for the marker to style it precisely
    const el = document.createElement('div');
    el.className = 'marker-incident';
    el.innerHTML = '<i class="pi pi-exclamation-triangle"></i>';
    
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([incident.longitude, incident.latitude])
      .addTo(map);
      
    // When clicking the marker, select it
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      emit('incident-selected', incident.id);
    });

    markers.push({ id: incident.id, marker, el });
  });

  // Draw Businesses (Markers)
  props.businesses.forEach(business => {
    const el = document.createElement('div');
    el.className = 'marker-business';
    el.innerHTML = '<i class="pi pi-shop"></i>';

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([business.longitude, business.latitude])
      .addTo(map);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      emit('business-selected', business.id);
    });

    markers.push({ id: business.id, marker, el });
  });

  // Apply initial selection
  updateSelection();
};

/** Highlights the currently selected zone or marker.
* @returns {void} No return value. */
const updateSelection = () => {
  if (!map || !map.isStyleLoaded()) return;

  // Update Zones
  props.riskZones.forEach(zone => {
    const lineLayerId = `zone-line-layer-${zone.id}`;
    if (map.getLayer(lineLayerId)) {
      const isSelected = props.selectedItemId === zone.id;
      map.setPaintProperty(lineLayerId, 'line-width', isSelected ? 5 : 2);
    }
  });

  // Update Markers
  markers.forEach(m => {
    if (m.id === props.selectedItemId) {
      m.el.classList.add('selected');
    } else {
      m.el.classList.remove('selected');
    }
  });
};

watch(() => [props.riskZones, props.incidents, props.businesses], () => {
  drawMapData();
}, { deep: true });

watch(() => props.selectedItemId, () => {
  updateSelection();
});

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});
</script>

<style>
.map-container {
  height: 100%;
  width: 100%;
}

.marker-incident {
  background-color: white;
  border: 2px solid #ef4444;
  color: #ef4444;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.marker-business {
  background-color: #2563eb;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  border: 2px solid white;
  transition: all 0.2s;
}

.marker-incident.selected,
.marker-business.selected {
  transform: scale(1.4);
  box-shadow: 0 0 15px rgba(0,0,0,0.5);
  z-index: 1000;
}
</style>
