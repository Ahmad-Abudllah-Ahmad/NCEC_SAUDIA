import { useEffect, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  MapPin, Layers, Navigation, Eye, EyeOff, Mountain, Building2,
  Factory, TreePine, FlaskConical, Sun, Moon, Satellite, X,
  ChevronRight, Activity, Wind, Droplets, Thermometer,
  Shield, Compass, Waves, Info, Globe2, Map
} from 'lucide-react'
import { useLang } from '../i18n'

/* ──────────────────────────── Cesium Ion Token ──────────────────────────── */
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0ZGUzN2VjZC04MzE3LTRjNGUtOWY0OS1jNGVjYjY5MmJlYjQiLCJpZCI6NDU1ODU5LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODM5MzYxNTN9.VuU7coWQJqZnrneuphKi9CwylG8zozpJP5gSjFdkeuU'

/* ──────────────────────────── Data: Saudi Cities ──────────────────────────── */
interface City {
  name: string
  nameAr: string
  lng: number
  lat: number
  height: number
  pitch: number
  bearing: number
}

const cities: City[] = [
  { name: 'Riyadh', nameAr: 'الرياض', lng: 46.6753, lat: 24.7136, height: 25000, pitch: -45, bearing: 0 },
  { name: 'Jeddah', nameAr: 'جدة', lng: 39.1925, lat: 21.4858, height: 20000, pitch: -40, bearing: 30 },
  { name: 'Makkah', nameAr: 'مكة المكرمة', lng: 39.8579, lat: 21.3891, height: 15000, pitch: -45, bearing: -20 },
  { name: 'Madinah', nameAr: 'المدينة المنورة', lng: 39.6142, lat: 24.4539, height: 18000, pitch: -40, bearing: 15 },
  { name: 'Dammam', nameAr: 'الدمام', lng: 50.1033, lat: 26.4207, height: 22000, pitch: -45, bearing: -30 },
  { name: 'NEOM', nameAr: 'نيوم', lng: 35.0667, lat: 27.9500, height: 50000, pitch: -45, bearing: 45 },
  { name: 'Tabuk', nameAr: 'تبوك', lng: 36.5572, lat: 28.3838, height: 25000, pitch: -45, bearing: 0 },
  { name: 'Abha', nameAr: 'أبها', lng: 42.5053, lat: 18.2164, height: 20000, pitch: -40, bearing: -15 },
]

/* ──────────────────────────── Data: NCEC Offices ──────────────────────────── */
interface NCECOffice {
  name: string
  nameAr: string
  lng: number
  lat: number
  type: 'HQ' | 'Regional' | 'Branch'
  staff: number
  desc: string
  descAr: string
}

const ncecOffices: NCECOffice[] = [
  { name: 'NCEC Headquarters', nameAr: 'المقر الرئيسي', lng: 46.6885, lat: 24.7241, type: 'HQ', staff: 284, desc: 'National Center for Environmental Compliance — Main Office', descAr: 'المركز الوطني للرقابة على الالتزام البيئي — المقر الرئيسي' },
  { name: 'NCEC Western Region', nameAr: 'المنطقة الغربية', lng: 39.1750, lat: 21.5168, type: 'Regional', staff: 78, desc: 'Western Region Office — Jeddah', descAr: 'مكتب المنطقة الغربية — جدة' },
  { name: 'NCEC Eastern Region', nameAr: 'المنطقة الشرقية', lng: 50.0888, lat: 26.3920, type: 'Regional', staff: 65, desc: 'Eastern Region Office — Dammam', descAr: 'مكتب المنطقة الشرقية — الدمام' },
  { name: 'NCEC Northern Region', nameAr: 'المنطقة الشمالية', lng: 36.5700, lat: 28.3900, type: 'Branch', staff: 32, desc: 'Northern Region Branch — Tabuk', descAr: 'فرع المنطقة الشمالية — تبوك' },
  { name: 'NCEC Southern Region', nameAr: 'المنطقة الجنوبية', lng: 42.5100, lat: 18.2200, type: 'Branch', staff: 28, desc: 'Southern Region Branch — Abha', descAr: 'فرع المنطقة الجنوبية — أبها' },
]

/* ──────────────────────────── Data: Monitoring Stations ──────────────────────────── */
interface Station {
  name: string
  nameAr: string
  lng: number
  lat: number
  aqi: number
  pm25: number
  pm10: number
  no2: number
  temp: number
  status: 'good' | 'moderate' | 'unhealthy'
}

const monitoringStations: Station[] = [
  { name: 'Riyadh Central AMS', nameAr: 'محطة الرياض المركزية', lng: 46.7100, lat: 24.6500, aqi: 62, pm25: 28, pm10: 78, no2: 42, temp: 44, status: 'moderate' },
  { name: 'Riyadh Industrial', nameAr: 'الرياض الصناعية', lng: 46.8400, lat: 24.5800, aqi: 121, pm25: 55, pm10: 134, no2: 68, temp: 45, status: 'unhealthy' },
  { name: 'Jeddah Corniche', nameAr: 'كورنيش جدة', lng: 39.1400, lat: 21.5400, aqi: 48, pm25: 18, pm10: 45, no2: 22, temp: 38, status: 'good' },
  { name: 'Jeddah South Industrial', nameAr: 'جدة الجنوبية الصناعية', lng: 39.2100, lat: 21.4200, aqi: 98, pm25: 42, pm10: 96, no2: 51, temp: 39, status: 'moderate' },
  { name: 'Dammam Port', nameAr: 'ميناء الدمام', lng: 50.2000, lat: 26.4400, aqi: 75, pm25: 32, pm10: 82, no2: 38, temp: 42, status: 'moderate' },
  { name: 'Jubail Industrial', nameAr: 'الجبيل الصناعية', lng: 49.6600, lat: 27.0100, aqi: 142, pm25: 65, pm10: 156, no2: 78, temp: 43, status: 'unhealthy' },
  { name: 'Yanbu Industrial', nameAr: 'ينبع الصناعية', lng: 38.0600, lat: 24.0900, aqi: 105, pm25: 48, pm10: 112, no2: 55, temp: 40, status: 'unhealthy' },
  { name: 'Makkah Central', nameAr: 'مكة المركزية', lng: 39.8300, lat: 21.4100, aqi: 55, pm25: 22, pm10: 58, no2: 28, temp: 41, status: 'moderate' },
  { name: 'Madinah North', nameAr: 'المدينة الشمالية', lng: 39.6300, lat: 24.5000, aqi: 38, pm25: 14, pm10: 35, no2: 18, temp: 43, status: 'good' },
  { name: 'Tabuk Station', nameAr: 'محطة تبوك', lng: 36.5800, lat: 28.3700, aqi: 32, pm25: 12, pm10: 30, no2: 15, temp: 36, status: 'good' },
  { name: 'Abha Mountain', nameAr: 'محطة أبها الجبلية', lng: 42.5200, lat: 18.2300, aqi: 25, pm25: 8, pm10: 22, no2: 12, temp: 24, status: 'good' },
  { name: 'NEOM Baseline', nameAr: 'نيوم القاعدية', lng: 36.1000, lat: 27.9600, aqi: 18, pm25: 5, pm10: 15, no2: 8, temp: 32, status: 'good' },
  { name: 'Ras Al-Khair', nameAr: 'رأس الخير', lng: 49.2300, lat: 27.4800, aqi: 88, pm25: 38, pm10: 92, no2: 45, temp: 41, status: 'moderate' },
  { name: 'Al-Ahsa Oasis', nameAr: 'واحة الأحساء', lng: 49.5800, lat: 25.3800, aqi: 45, pm25: 19, pm10: 48, no2: 24, temp: 46, status: 'good' },
  { name: 'Riyadh KAFD', nameAr: 'حي الملك عبدالله المالي', lng: 46.6400, lat: 24.7600, aqi: 58, pm25: 25, pm10: 65, no2: 35, temp: 44, status: 'moderate' },
]

/* ──────────────────────────── Data: Industrial Zones ──────────────────────────── */
interface IndustrialZone {
  name: string
  nameAr: string
  center: [number, number]
  facilities: number
  area: string
  emissions: 'High' | 'Moderate' | 'Low'
  emissionsAr: string
}

const industrialZones: IndustrialZone[] = [
  { name: 'Jubail Industrial City', nameAr: 'مدينة الجبيل الصناعية', center: [49.62, 27.01], facilities: 142, area: '1016 km²', emissions: 'High', emissionsAr: 'مرتفعة' },
  { name: 'Yanbu Industrial City', nameAr: 'مدينة ينبع الصناعية', center: [38.06, 24.09], facilities: 89, area: '185 km²', emissions: 'Moderate', emissionsAr: 'متوسطة' },
  { name: 'Ras Al-Khair Industrial', nameAr: 'رأس الخير الصناعية', center: [49.23, 27.48], facilities: 34, area: '72 km²', emissions: 'Moderate', emissionsAr: 'متوسطة' },
  { name: 'Riyadh 2nd Industrial', nameAr: 'الرياض الصناعية الثانية', center: [46.84, 24.58], facilities: 210, area: '98 km²', emissions: 'High', emissionsAr: 'مرتفعة' },
  { name: 'Jeddah 1st Industrial', nameAr: 'جدة الصناعية الأولى', center: [39.21, 21.42], facilities: 156, area: '62 km²', emissions: 'Moderate', emissionsAr: 'متوسطة' },
  { name: 'KAEC Industrial Valley', nameAr: 'وادي مدينة الملك عبدالله الصناعي', center: [39.13, 22.45], facilities: 45, area: '55 km%', emissions: 'Low', emissionsAr: 'منخفضة' },
]

/* ──────────────────────────── Data: Protected Areas ──────────────────────────── */
interface ProtectedArea {
  name: string
  nameAr: string
  center: [number, number]
  area: string
  type: 'Marine Reserve' | 'Wildlife Reserve' | 'Nature Reserve'
  typeAr: string
}

const protectedAreas: ProtectedArea[] = [
  { name: 'Farasan Islands', nameAr: 'جزر فرسان', center: [41.98, 16.70], area: '5,408 km²', type: 'Marine Reserve', typeAr: 'محمية بحرية' },
  { name: 'Harrat Uwayrid', nameAr: 'حرة عويرض', center: [37.30, 26.90], area: '2,150 km²', type: 'Wildlife Reserve', typeAr: 'محمية حياة فطرية' },
  { name: 'Uruq Bani Ma\'arid', nameAr: 'عروق بني معارض', center: [45.90, 19.50], area: '12,658 km²', type: 'Nature Reserve', typeAr: 'محمية طبيعية' },
  { name: 'Al-Tubayq Reserve', nameAr: 'محمية الطبيق', center: [37.20, 29.50], area: '12,105 km²', type: 'Wildlife Reserve', typeAr: 'محمية حياة فطرية' },
  { name: 'Ibex Reserve', nameAr: 'محمية الوعل', center: [41.70, 20.30], area: '2,369 km²', type: 'Wildlife Reserve', typeAr: 'محمية حياة فطرية' },
  { name: 'Al-Khunfah Reserve', nameAr: 'محمية الخنفة', center: [42.30, 29.20], area: '19,339 km²', type: 'Nature Reserve', typeAr: 'محمية طبيعية' },
]

/* ──────────────────────────── Data: EIA Active Projects ──────────────────────────── */
interface EIAProject {
  name: string
  nameAr: string
  lng: number
  lat: number
  status: 'Approved' | 'Under Review' | 'Pending'
  statusAr: string
  pages: number
  progress: number
}

const eiaProjects: EIAProject[] = [
  { name: 'Red Sea Coastal Development', nameAr: 'تطوير ساحل البحر الأحمر', lng: 38.50, lat: 25.30, status: 'Under Review', statusAr: 'قيد المراجعة', pages: 612, progress: 72 },
  { name: 'NEOM Industrial Complex', nameAr: 'مجمع نيوم الصناعي', lng: 36.20, lat: 27.80, status: 'Pending', statusAr: 'معلق', pages: 445, progress: 31 },
  { name: 'Jubail Desalination Expansion', nameAr: 'توسعة تحلية الجبيل', lng: 49.70, lat: 27.05, status: 'Under Review', statusAr: 'قيد المراجعة', pages: 328, progress: 88 },
  { name: 'Riyadh Metro Green Corridor', nameAr: 'الممر الأخضر لمترو الرياض', lng: 46.68, lat: 24.71, status: 'Approved', statusAr: 'معتمد', pages: 256, progress: 100 },
  { name: 'Jeddah Tower Foundation', nameAr: 'أساسات برج جدة', lng: 39.10, lat: 21.62, status: 'Under Review', statusAr: 'قيد المراجعة', pages: 189, progress: 55 },
  { name: 'Al-Ula Heritage Restoration', nameAr: 'ترميم العلا التراثي', lng: 37.92, lat: 26.62, status: 'Approved', statusAr: 'معتمد', pages: 134, progress: 100 },
]

/* ──────────────────────────── Data: Red Sea Trenches ──────────────────────────── */
interface Trench {
  name: string
  nameAr: string
  lng: number
  lat: number
  depth: number
  temp: number
  salinity: string
  desc: string
  descAr: string
}

const redSeaTrenches: Trench[] = [
  { name: 'Suakin Deep', nameAr: 'منخفض سواكن العميق', lng: 38.83, lat: 19.64, depth: 2780, temp: 24.5, salinity: '150 ‰', desc: 'One of the deepest and hottest brine pools in the Red Sea rift, exhibiting active hydrothermal vents.', descAr: 'أحد أعمق وأكثر أحواض المحلول الملحية حرارة في أخدود البحر الأحمر، ويحتوي على فتحات حرارية مائية نشطة.' },
  { name: 'Atlantis II Deep', nameAr: 'منخفض أتلانتس 2 العميق', lng: 38.08, lat: 21.35, depth: 2194, temp: 68.0, salinity: '270 ‰', desc: 'Famous for its massive metal-rich sediments and extreme water temperatures due to geothermal heating.', descAr: 'مشهور برواسبه الضخمة الغنية بالمعادن ودرجات حرارة المياه القصوى بسبب التدفئة الجوفية.' },
  { name: 'Nereus Deep', nameAr: 'منخفض نيريوس العميق', lng: 37.28, lat: 23.15, depth: 2300, temp: 22.0, salinity: '85 ‰', desc: 'A major tectonic deep in the central Red Sea containing unique metal-bearing muds.', descAr: 'منخفض تكتوني رئيسي في وسط البحر الأحمر يحتوي على طين فريد يحمل المعادن.' },
  { name: 'Valdivia Deep', nameAr: 'منخفض فالديفيا العميق', lng: 35.85, lat: 25.12, depth: 1600, temp: 21.8, salinity: '60 ‰', desc: 'A complex brine deep named after the Valdivia expedition, showing distinct stratified brine layers.', descAr: 'منخفض ملحي معقد سمي على اسم بعثة فالديفيا، يظهر طبقات ملحية متمايزة.' },
  { name: 'Al Wajh Basin', nameAr: 'حوض الوجه العميق', lng: 36.15, lat: 26.35, depth: 1200, temp: 21.5, salinity: '41 ‰', desc: 'Located in the northern Red Sea, characterized by deep sediment layers and steep slopes.', descAr: 'يقع في شمال البحر الأحمر، ويتميز بطبقات رسوبية عميقة ومنحدرات شديدة.' },
]

/* ──────────────────────────── Map Styles ──────────────────────────── */
const mapStyles = [
  { id: 'streets', label: 'Light Map', labelAr: 'فاتح', icon: Sun, styleVal: Cesium.IonWorldImageryStyle.ROAD },
  { id: 'satellite-labels', label: 'Satellite Hybrid', labelAr: 'قمر صناعي هجين', icon: Satellite, styleVal: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS },
  { id: 'satellite', label: 'Satellite', labelAr: 'قمر صناعي', icon: Moon, styleVal: Cesium.IonWorldImageryStyle.AERIAL },
]

/* ──────────────────────────── Helpers ──────────────────────────── */
function aqiColor(aqi: number): string {
  if (aqi <= 50) return '#10b981' // Green
  if (aqi <= 100) return '#f59e0b' // Yellow/Orange
  if (aqi <= 150) return '#f97316' // Darker Orange
  if (aqi <= 200) return '#ef4444' // Red
  return '#7c3aed' // Purple
}

function aqiLabel(aqi: number, isAr: boolean): string {
  if (aqi <= 50) return isAr ? 'جيد' : 'Good'
  if (aqi <= 100) return isAr ? 'متوسط' : 'Moderate'
  if (aqi <= 150) return isAr ? 'غير صحي للحساسين' : 'Unhealthy (Sensitive)'
  if (aqi <= 200) return isAr ? 'غير صحي' : 'Unhealthy'
  return isAr ? 'خطر' : 'Hazardous'
}

/* ──────────────────────────── Component ──────────────────────────── */
export default function MapPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'

  const mapContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const buildingsRef = useRef<any>(null)
  const minimapContainer = useRef<HTMLDivElement>(null)
  const minimapViewerRef = useRef<Cesium.Viewer | null>(null)
  const isHoveringMinimap = useRef(false)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentStyle, setCurrentStyle] = useState('satellite-labels')
  const [terrain3D, setTerrain3D] = useState(true)
  const [showBuildings, setShowBuildings] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [terrainExaggeration, setTerrainExaggeration] = useState(2.0)
  const [is3DMode, setIs3DMode] = useState(true)

  // Hover Coordinates state
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number; elevation: number } | null>(null)

  // Selected Entity Detail state
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null)

  // Layer toggles
  const [layers, setLayers] = useState({
    offices: true,
    monitoring: true,
    industrial: true,
    protected: true,
    eia: true,
    trenches: true,
  })

  // Advanced Filters
  const [officeFilter, setOfficeFilter] = useState<'all' | 'HQ' | 'Regional' | 'Branch'>('all')
  const [aqiFilter, setAqiFilter] = useState<'all' | 'good' | 'moderate' | 'unhealthy'>('all')
  const [maxAqiSlider, setMaxAqiSlider] = useState(200)
  const [emissionFilter, setEmissionFilter] = useState<'all' | 'High' | 'Moderate' | 'Low'>('all')
  const [protectedFilter, setProtectedFilter] = useState<'all' | 'Marine Reserve' | 'Wildlife Reserve' | 'Nature Reserve'>('all')
  const [eiaFilter, setEiaFilter] = useState<'all' | 'Approved' | 'Under Review' | 'Pending'>('all')
  const [minTrenchDepth, setMinTrenchDepth] = useState(0)

  const toggleLayer = useCallback((key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  /* ────── Initialize Cesium Map ────── */
  useEffect(() => {
    if (!mapContainer.current || viewerRef.current) return

    let active = true
    let viewer: Cesium.Viewer | null = null

    const initCesium = async () => {
      Cesium.Ion.defaultAccessToken = CESIUM_TOKEN

      // Load 3D Terrain
      let terrainProvider
      try {
        terrainProvider = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        })
      } catch (err) {
        console.warn("Failed to load world terrain, using default ellipsoid terrain.", err)
      }

      if (!active || !mapContainer.current) return

      // Initialize Viewer
      viewer = new Cesium.Viewer(mapContainer.current, {
        terrainProvider: terrainProvider,
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        fullscreenButton: false,
      })

      // Globe Settings
      viewer.scene.globe.enableLighting = true
      viewer.scene.globe.depthTestAgainstTerrain = true

      // Camera limits & constraints to avoid glitches and limit view to Saudi Arabia
      viewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z; // Prevents rolling/spinning the globe sideways

      const controller = viewer.scene.screenSpaceCameraController;
      controller.minimumZoomDistance = 250.0; // 250 meters (allows zooming in to street level)
      controller.maximumZoomDistance = 3200000.0; // 3,200 km (prevents zooming out to see the entire Earth)
      controller.maximumTiltAngle = Cesium.Math.toRadians(75.0); // Limit tilt angle relative to normal
      controller.enableCollisionDetection = true;

      // Explicitly allow zoom through mouse wheel, touch pinch, and right click drag
      controller.zoomEventTypes = [
        Cesium.CameraEventType.WHEEL,
        Cesium.CameraEventType.PINCH,
        Cesium.CameraEventType.RIGHT_DRAG
      ];

      // Restrict camera to Saudi Arabia geographical bounds with threshold to avoid recursion and zoom stutter
      viewer.camera.percentageChanged = 0.1;
      viewer.camera.changed.addEventListener(() => {
        if (!viewer) return
        const cartographic = viewer.camera.positionCartographic
        if (!cartographic) return

        const lat = Cesium.Math.toDegrees(cartographic.latitude)
        const lng = Cesium.Math.toDegrees(cartographic.longitude)

        // Bounding box around Saudi Arabia (including Red Sea and Arabian Gulf edges)
        const minLat = 12.0
        const maxLat = 33.5
        const minLng = 33.5
        const maxLng = 58.5

        let clampLat = Math.max(minLat, Math.min(maxLat, lat))
        let clampLng = Math.max(minLng, Math.min(maxLng, lng))

        // Programmatically clamp pitch to prevent looking up to space or flipping
        const minPitch = Cesium.Math.toRadians(-90.0)
        const maxPitch = Cesium.Math.toRadians(-5.0)
        let pitch = viewer.camera.pitch
        let clampPitch = Math.max(minPitch, Math.min(maxPitch, pitch))

        // Only snap the camera if it moves significantly out of bounds to keep zoom-in smooth
        const threshold = 0.2;
        if (Math.abs(lat - clampLat) > threshold || Math.abs(lng - clampLng) > threshold || Math.abs(pitch - clampPitch) > 0.05) {
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(clampLng, clampLat, cartographic.height),
            orientation: {
              heading: viewer.camera.heading,
              pitch: clampPitch,
              roll: 0.0
            }
          })
        }
      })

      // Add NCEC Data Layers as Entities
      addStaticDataLayers(viewer)

      // Center/Fly to Saudi Arabia initial perspective
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(45.08, 23.89, 2300000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-55.0),
          roll: 0.0,
        }
      })

      // Store reference & mark loaded
      viewerRef.current = viewer
      setMapLoaded(true)

      // Setup Interactions (mouse move & clicks)
      setupInteractions(viewer)
    }

    initCesium()

    return () => {
      active = false
      if (viewer) {
        viewer.destroy()
      }
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ────── Initialize 2D Minimap after Map Loaded ────── */
  useEffect(() => {
    if (!mapLoaded || !minimapContainer.current || minimapViewerRef.current) return

    let miniViewer: Cesium.Viewer | null = null
    try {
      miniViewer = new Cesium.Viewer(minimapContainer.current, {
        sceneMode: Cesium.SceneMode.SCENE3D,
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        fullscreenButton: false,
      })

      // Hide credit container
      const credit = miniViewer.container.querySelector('.cesium-viewer-bottom') as HTMLElement
      if (credit) {
        credit.style.display = 'none'
      }

      // Restrict camera to Saudi Arabia geographical bounds
      miniViewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z
      const miniController = miniViewer.scene.screenSpaceCameraController
      miniController.minimumZoomDistance = 250000.0
      miniController.maximumZoomDistance = 4000000.0
      miniController.enableTilt = false
      miniController.enableLook = false
      miniController.enableTranslate = false
      miniController.enableZoom = false
      miniController.enableRotate = false

      // Set ROAD imagery style for clean 2D overview look
      try {
        Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.ROAD
        }).then(provider => {
          if (miniViewer && !miniViewer.isDestroyed()) {
            miniViewer.imageryLayers.removeAll()
            miniViewer.imageryLayers.addImageryProvider(provider)
          }
        })
      } catch (err) {
        console.warn("Failed to load ROAD imagery for minimap.", err)
      }

      // Add static data layers to minimap
      addStaticDataLayers(miniViewer, true)

      // Center to Saudi Arabia
      miniViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(45.08, 23.89, 2300000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-90.0),
          roll: 0.0,
        }
      })

      minimapViewerRef.current = miniViewer

      // Bidirectional Sync
      // Sync main camera to minimap
      const mainViewer = viewerRef.current
      if (mainViewer) {
        mainViewer.camera.changed.addEventListener(() => {
          if (!viewerRef.current || !minimapViewerRef.current) return
          if (isHoveringMinimap.current) return

          const carto = viewerRef.current.camera.positionCartographic
          if (carto) {
            const lat = Cesium.Math.toDegrees(carto.latitude)
            const lng = Cesium.Math.toDegrees(carto.longitude)

            minimapViewerRef.current.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(lng, lat, carto.height),
              orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(-90.0),
                roll: 0.0
              }
            })
          }
        })
      }

      // Sync minimap camera to main
      miniViewer.camera.changed.addEventListener(() => {
        if (!viewerRef.current || !minimapViewerRef.current) return
        const carto = minimapViewerRef.current.camera.positionCartographic
        if (!carto) return

        // Clamp bounds of minimap to Saudi Arabia
        const lat = Cesium.Math.toDegrees(carto.latitude)
        const lng = Cesium.Math.toDegrees(carto.longitude)

        const minLat = 12.0
        const maxLat = 33.5
        const minLng = 33.5
        const maxLng = 58.5

        let clampLat = Math.max(minLat, Math.min(maxLat, lat))
        let clampLng = Math.max(minLng, Math.min(maxLng, lng))

        if (lat !== clampLat || lng !== clampLng) {
          minimapViewerRef.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(clampLng, clampLat, carto.height),
            orientation: {
              heading: 0.0,
              pitch: Cesium.Math.toRadians(-90.0),
              roll: 0.0
            }
          })
          return
        }

        if (isHoveringMinimap.current) {
          const mainCamera = viewerRef.current.camera
          viewerRef.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, carto.height),
            orientation: {
              heading: mainCamera.heading,
              pitch: mainCamera.pitch,
              roll: 0.0
            }
          })
        }
      })

    } catch (err) {
      console.warn("Failed to initialize overview map:", err)
    }

    return () => {
      if (minimapViewerRef.current) {
        try {
          minimapViewerRef.current.destroy()
        } catch (e) {
          console.warn(e)
        }
        minimapViewerRef.current = null
      }
    }
  }, [mapLoaded])

  /* ────── Add Static Entities to Viewer ────── */
  const addStaticDataLayers = (v: Cesium.Viewer, isMinimap: boolean = false) => {
    // 1. NCEC Offices
    ncecOffices.forEach((office, index) => {
      v.entities.add({
        id: `office_${index}`,
        name: office.name,
        position: Cesium.Cartesian3.fromDegrees(office.lng, office.lat, 0),
        billboard: {
          image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23059669" stroke="white" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 4v14"/></svg>',
          width: isMinimap ? 14 : 28,
          height: isMinimap ? 14 : 28,
          heightReference: Cesium.HeightReference.NONE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: {
          ...office,
          layer: 'offices',
        },
      })
    })

    // 2. Monitoring Stations
    monitoringStations.forEach((station, index) => {
      const color = aqiColor(station.aqi)
      const sensorRange = 30000.0 // 30 km sensing coverage radius

      v.entities.add({
        id: `station_${index}`,
        name: station.name,
        position: Cesium.Cartesian3.fromDegrees(station.lng, station.lat, 0),
        point: {
          pixelSize: isMinimap ? 6 : 12,
          color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: isMinimap ? 1 : 2,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: {
          ...station,
          layer: 'monitoring',
        },
      })

      // 3D sensing range circle (low translucent cylinder disc clamped to ground)
      if (!isMinimap) {
        v.entities.add({
          id: `station_range_${index}`,
          name: `${station.name} Range`,
          position: Cesium.Cartesian3.fromDegrees(station.lng, station.lat, 0),
          cylinder: {
            length: 200.0,
            topRadius: sensorRange,
            bottomRadius: sensorRange,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.12),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.4),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...station,
            layer: 'monitoring_range',
          },
        })
      } else {
        // Simple ellipse for minimap
        v.entities.add({
          id: `station_range_${index}`,
          name: `${station.name} Range`,
          position: Cesium.Cartesian3.fromDegrees(station.lng, station.lat, 0),
          ellipse: {
            semiMinorAxis: sensorRange,
            semiMajorAxis: sensorRange,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.12),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...station,
            layer: 'monitoring_range',
          },
        })
      }
    })

    // 3. Industrial Zones (Glowing 3D Cylinders!)
    industrialZones.forEach((zone, index) => {
      if (!isMinimap) {
        v.entities.add({
          id: `industrial_${index}`,
          name: zone.name,
          position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1], 3000),
          cylinder: {
            length: 6000.0,
            topRadius: 10000.0,
            bottomRadius: 10000.0,
            material: Cesium.Color.fromCssColorString('#f97316').withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#ea580c'),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...zone,
            layer: 'industrial',
          },
        })
      } else {
        v.entities.add({
          id: `industrial_${index}`,
          name: zone.name,
          position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1], 0),
          ellipse: {
            semiMinorAxis: 10000.0,
            semiMajorAxis: 10000.0,
            material: Cesium.Color.fromCssColorString('#f97316').withAlpha(0.25),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...zone,
            layer: 'industrial',
          },
        })
      }
    })

    // 4. Protected Areas (Translucent Green Cylinders)
    protectedAreas.forEach((area, index) => {
      if (!isMinimap) {
        v.entities.add({
          id: `protected_${index}`,
          name: area.name,
          position: Cesium.Cartesian3.fromDegrees(area.center[0], area.center[1], 2000),
          cylinder: {
            length: 4000.0,
            topRadius: 15000.0,
            bottomRadius: 15000.0,
            material: Cesium.Color.fromCssColorString('#16a34a').withAlpha(0.2),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#15803d'),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...area,
            layer: 'protected',
          },
        })
      } else {
        v.entities.add({
          id: `protected_${index}`,
          name: area.name,
          position: Cesium.Cartesian3.fromDegrees(area.center[0], area.center[1], 0),
          ellipse: {
            semiMinorAxis: 15000.0,
            semiMajorAxis: 15000.0,
            material: Cesium.Color.fromCssColorString('#16a34a').withAlpha(0.2),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            ...area,
            layer: 'protected',
          },
        })
      }
    })

    // 5. EIA Active Projects
    eiaProjects.forEach((project, index) => {
      const statusColor = project.status === 'Approved' ? '#10b981' : project.status === 'Pending' ? '#f59e0b' : '#0ea5e9'
      v.entities.add({
        id: `eia_${index}`,
        name: project.name,
        position: Cesium.Cartesian3.fromDegrees(project.lng, project.lat, 0),
        billboard: {
          image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${encodeURIComponent(statusColor)}" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
          width: isMinimap ? 12 : 24,
          height: isMinimap ? 12 : 24,
          heightReference: Cesium.HeightReference.NONE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: {
          ...project,
          layer: 'eia',
        },
      })
    })

    // 6. Red Sea Trenches & Depths (Cones representing bathymetric depth)
    redSeaTrenches.forEach((trench, index) => {
      // Draw cone pointing downwards to represent the deep trench structure
      v.entities.add({
        id: `trench_${index}`,
        name: trench.name,
        position: Cesium.Cartesian3.fromDegrees(trench.lng, trench.lat, -trench.depth / 2),
        cylinder: {
          length: trench.depth,
          topRadius: 12000.0,
          bottomRadius: 1000.0, // cone tip pointing down to the ocean bed
          material: Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(0.35),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#0284c7'),
          heightReference: Cesium.HeightReference.NONE,
        },
        properties: {
          ...trench,
          layer: 'trench',
        },
      })
    })
  }

  /* ────── Setup Mouse Movements and Clicks ────── */
  const setupInteractions = (v: Cesium.Viewer) => {
    const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas)

    // Handle mouse movement for coordinates/height
    handler.setInputAction((movement: any) => {
      const ray = v.camera.getPickRay(movement.endPosition)
      if (!ray) return
      const position = v.scene.globe.pick(ray, v.scene)

      if (Cesium.defined(position)) {
        const cartographic = Cesium.Cartographic.fromCartesian(position)
        if (cartographic) {
          const lat = Cesium.Math.toDegrees(cartographic.latitude)
          const lng = Cesium.Math.toDegrees(cartographic.longitude)
          const height = cartographic.height

          setHoverCoords({
            lat: parseFloat(lat.toFixed(4)),
            lng: parseFloat(lng.toFixed(4)),
            elevation: parseFloat(height.toFixed(1)),
          })
        }
      } else {
        setHoverCoords(null)
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // Handle entity click selection
    handler.setInputAction((click: any) => {
      const pickedObject = v.scene.pick(click.position)
      if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
        const entity = pickedObject.id
        const props = entity.properties?.getValue(Cesium.JulianDate.now())
        if (props) {
          setSelectedEntity({
            id: entity.id,
            name: entity.name,
            properties: props,
          })
        }
      } else {
        setSelectedEntity(null)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  /* ────── Handle Layers Visibility & Filters Reactivity ────── */
  useEffect(() => {
    if (!viewerRef.current || !mapLoaded) return

    const viewers = [viewerRef.current]
    if (minimapViewerRef.current) {
      viewers.push(minimapViewerRef.current)
    }

    viewers.forEach(v => {
      v.entities.values.forEach(entity => {
        const props = entity.properties?.getValue(Cesium.JulianDate.now())
        if (!props) return

        let show = true

        // Layer check & internal filters
        if (props.layer === 'offices') {
          show = layers.offices && (officeFilter === 'all' || props.type === officeFilter)
        } else if (props.layer === 'monitoring') {
          let match = true
          if (aqiFilter === 'good' && props.aqi > 50) match = false
          if (aqiFilter === 'moderate' && (props.aqi <= 50 || props.aqi > 100)) match = false
          if (aqiFilter === 'unhealthy' && props.aqi <= 100) match = false
          show = layers.monitoring && match && props.aqi <= maxAqiSlider
        } else if (props.layer === 'monitoring_range') {
          let match = true
          if (aqiFilter === 'good' && props.aqi > 50) match = false
          if (aqiFilter === 'moderate' && (props.aqi <= 50 || props.aqi > 100)) match = false
          if (aqiFilter === 'unhealthy' && props.aqi <= 100) match = false
          show = layers.monitoring && match && props.aqi <= maxAqiSlider
        } else if (props.layer === 'industrial') {
          show = layers.industrial && (emissionFilter === 'all' || props.emissions === emissionFilter)
        } else if (props.layer === 'protected') {
          show = layers.protected && (protectedFilter === 'all' || props.type === protectedFilter)
        } else if (props.layer === 'eia') {
          show = layers.eia && (eiaFilter === 'all' || props.status === eiaFilter)
        } else if (props.layer === 'trench') {
          show = layers.trenches && props.depth >= minTrenchDepth
        }

        entity.show = show
      })
    })
  }, [
    layers, officeFilter, aqiFilter, maxAqiSlider, emissionFilter,
    protectedFilter, eiaFilter, minTrenchDepth, mapLoaded
  ])

  /* ────── Toggle 3D Terrain Exaggeration ────── */
  useEffect(() => {
    if (!viewerRef.current || !mapLoaded) return
    const viewer = viewerRef.current

    // If buildings are showing, we MUST disable terrain exaggeration (set to 1.0)
    // otherwise the buildings will sink underground and be hidden!
    const effectiveExaggeration = showBuildings ? 1.0 : (terrain3D ? terrainExaggeration : 1.0);

    (viewer.scene as any).terrainExaggeration = effectiveExaggeration;
    if ('verticalExaggeration' in viewer.scene) {
      (viewer.scene as any).verticalExaggeration = effectiveExaggeration;
    }
  }, [terrain3D, terrainExaggeration, showBuildings, mapLoaded])

  /* ────── Toggle 3D Buildings ────── */
  useEffect(() => {
    if (!viewerRef.current || !mapLoaded) return
    const viewer = viewerRef.current

    const handleBuildings = async () => {
      if (showBuildings) {
        if (!buildingsRef.current) {
          try {
            const buildings = await Cesium.createOsmBuildingsAsync()
            if (viewerRef.current && showBuildings) { // Check if still enabled
              buildingsRef.current = buildings
              viewer.scene.primitives.add(buildings)
            }
          } catch (err) {
            console.warn("Failed to load OSM Buildings", err)
          }
        } else {
          buildingsRef.current.show = true
        }
      } else {
        if (buildingsRef.current) {
          buildingsRef.current.show = false
        }
      }
    }

    handleBuildings()
  }, [showBuildings, mapLoaded])

  /* ────── Change Map Style ────── */
  const changeStyle = useCallback(async (styleId: string) => {
    if (!viewerRef.current) return
    const viewer = viewerRef.current

    const selectedStyleObj = mapStyles.find(s => s.id === styleId)
    if (!selectedStyleObj) return

    viewer.imageryLayers.removeAll()
    setCurrentStyle(styleId)

    try {
      const provider = await Cesium.createWorldImageryAsync({
        style: selectedStyleObj.styleVal
      })
      viewer.imageryLayers.addImageryProvider(provider)
    } catch (err) {
      console.error("Failed to load Cesium Imagery Style", err)
    }
  }, [])

  /* ────── Fly To City ────── */
  const flyToCity = useCallback((city: City) => {
    if (!viewerRef.current) return
    setActiveCity(city.name)
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, city.height),
      orientation: {
        heading: Cesium.Math.toRadians(city.bearing),
        pitch: Cesium.Math.toRadians(city.pitch),
        roll: 0.0,
      },
      duration: 3.0,
    })
  }, [])

  /* ────── Reset View ────── */
  const resetView = useCallback(() => {
    if (!viewerRef.current) return
    setActiveCity(null)
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(45.08, 23.89, 2300000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-55.0),
        roll: 0.0,
      },
      duration: 2.5,
    })
  }, [])

  /* ────── Toggle 3D / 2D Scene Mode ────── */
  const toggleSceneMode = useCallback(() => {
    if (!viewerRef.current) return
    const viewer = viewerRef.current
    const newMode = !is3DMode
    setIs3DMode(newMode)

    if (newMode) {
      // Switch to 3D Globe
      viewer.scene.morphTo3D(1.5)
      // Wait for morph to strictly finish, then fly to the default 3D view
      setTimeout(() => {
        resetView()
      }, 1600)
    } else {
      // Switch to 2D Flat Map
      viewer.scene.morphTo2D(1.5)
      setTimeout(() => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(45.08, 23.89, 2300000.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0,
          },
          duration: 1.5,
        })
      }, 1600)
    }
  }, [is3DMode])

  /* ────── Region Classifier Based on Hover Coordinates ────── */
  const getRegionName = (coords: { lat: number; lng: number; elevation: number }) => {
    const { lat, lng, elevation } = coords
    if (lng < 39.5) {
      if (elevation < 0) return isAr ? 'صدع البحر الأحمر المائي' : 'Red Sea Rift Zone'
      return isAr ? 'سهل تهامة الساحلي' : 'Tihama Coastal Plain'
    }
    if (lng >= 39.5 && lng < 43 && lat < 23) {
      return isAr ? 'مرتفعات السروات الجبلية' : 'Sarawat Mountain Range'
    }
    if (lng >= 35 && lng < 40 && lat >= 23) {
      return isAr ? 'سلسلة جبال الحجاز' : 'Hijaz Mountain Range'
    }
    if (lng >= 43 && lng < 48 && lat > 18 && lat < 28) {
      return isAr ? 'هضبة نجد الوسطى' : 'Najd Central Plateau'
    }
    if (lng >= 45 && lat <= 19.5) {
      return isAr ? 'صحراء الربع الخالي' : 'Rub\' al Khali (Empty Quarter)'
    }
    if (lng >= 48) {
      return isAr ? 'المنطقة الساحلية الشرقية' : 'Eastern Coastal Plain'
    }
    return isAr ? 'المملكة العربية السعودية' : 'Kingdom of Saudi Arabia'
  }

  // Count stations for dashboard statistics
  const goodStations = monitoringStations.filter(s => s.aqi <= 50).length
  const moderateStations = monitoringStations.filter(s => s.aqi > 50 && s.aqi <= 100).length
  const unhealthyStations = monitoringStations.filter(s => s.aqi > 100).length

  // Configurations for sidebar checkboxes/layers
  const layerConfig = [
    { key: 'offices' as const, icon: Building2, label: isAr ? 'مكاتب المركز' : 'NCEC Offices', count: ncecOffices.length, color: '#059669' },
    { key: 'monitoring' as const, icon: Activity, label: isAr ? 'محطات الرصد' : 'Monitoring Stations', count: monitoringStations.length, color: '#0ea5e9' },
    { key: 'industrial' as const, icon: Factory, label: isAr ? 'المناطق الصناعية' : 'Industrial Zones', count: industrialZones.length, color: '#f97316' },
    { key: 'protected' as const, icon: TreePine, label: isAr ? 'المحميات الطبيعية' : 'Protected Areas', count: protectedAreas.length, color: '#22c55e' },
    { key: 'eia' as const, icon: FlaskConical, label: isAr ? 'مشاريع EIA' : 'EIA Projects', count: eiaProjects.length, color: '#8b5cf6' },
    { key: 'trenches' as const, icon: Waves, label: isAr ? 'خنادق البحر الأحمر' : 'Red Sea Trenches', count: redSeaTrenches.length, color: '#0ea5e9' },
  ]

  return (
    <div className="map-page-container">
      <div className="map-wrapper relative w-full h-full">
        {/* Cesium Container */}
        <div ref={mapContainer} className="map-container w-full h-full" />

        {/* Floating Map Title Card */}
        <div className="absolute top-28 start-6 z-10 bg-slate-950/85 text-white border border-slate-800/80 p-3 rounded-xl shadow-2xl backdrop-blur-md w-60 flex flex-col gap-2">
          <div>
            <h1 className="text-[10px] font-black text-slate-100 tracking-wider uppercase leading-tight">
              {isAr ? 'خريطة رصد السعودية ثلاثية الأبعاد' : 'Saudi 3D Compliance Globe'}
            </h1>
            <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">
              {isAr
                ? 'منصة بيئية متكاملة لبيانات الرصد، المكاتب، الخنادق المائية، ومستويات الالتزام.'
                : 'Advanced 3D compliance engine for environmental monitoring & air quality.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => setShowPanel(!showPanel)}
              className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-bold rounded-lg py-1 cursor-pointer transition-colors border ${showPanel
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/30'
                : 'bg-slate-800/80 text-slate-200 border-slate-700/60 hover:text-white hover:border-brand-500/60'
                }`}
            >
              <Layers size={10} />
              {isAr ? 'اللوحة' : 'Panel'}
            </button>
            <button
              onClick={resetView}
              className="flex-1 flex items-center justify-center gap-1 text-[9px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg py-1 cursor-pointer transition-colors shadow-sm"
            >
              <Compass size={10} />
              {isAr ? '\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637' : 'Reset View'}
            </button>
          </div>
          {mapLoaded && (
            <button
              onClick={toggleSceneMode}
              className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-500 cursor-pointer bg-slate-900/50 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/40"
              title={is3DMode ? (isAr ? '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u062b\u0646\u0627\u0626\u064a\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : 'Switch to 2D Map') : (isAr ? '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0643\u0631\u0629 \u0627\u0644\u0623\u0631\u0636\u064a\u0629 \u062b\u0644\u0627\u062b\u064a\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : 'Switch to 3D Globe')}
            >
              <div className="flex items-center gap-1.5">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                    is3DMode ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180'
                  }`}>
                    <Globe2 size={15} className="text-emerald-400" />
                  </div>
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                    !is3DMode ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-180'
                  }`}>
                    <Map size={15} className="text-emerald-300" />
                  </div>
                </div>
                <div className="flex flex-col text-start">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">
                    {is3DMode ? (isAr ? '\u0648\u0636\u0639 \u0627\u0644\u0643\u0631\u0629 \u0627\u0644\u0623\u0631\u0636\u064a\u0629' : '3D GLOBE') : (isAr ? '\u062e\u0631\u064a\u0637\u0629 \u0645\u0633\u0637\u062d\u0629' : '2D MAP')}
                  </span>
                  <span className="text-[7px] text-slate-500 mt-0.5">
                    {is3DMode
                      ? (isAr ? '\u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u062b\u0646\u0627\u0626\u064a \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : 'Click to switch to 2D')
                      : (isAr ? '\u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u062b\u0644\u0627\u062b\u064a \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : 'Click to switch to 3D')}
                  </span>
                </div>
              </div>
              <div className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-all duration-500 ${
                is3DMode ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}>
                <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md flex items-center justify-center">
                  <span className="text-[6px] font-black text-slate-800">{is3DMode ? '3D' : '2D'}</span>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Loading overlay */}
        {!mapLoaded && (
          <div className="map-loading absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
            <div className="map-loading-spinner animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4" />
            <p className="text-sm font-semibold text-slate-300">
              {isAr ? 'جارٍ تحميل نظام الكرة الأرضية ثلاثي الأبعاد...' : 'Initializing 3D Compliance Globe...'}
            </p>
          </div>
        )}

        {/* Real-time coordinates — bottom line */}
        {mapLoaded && hoverCoords && (
          <div className="absolute bottom-3 start-4 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-3 text-[11px] text-slate-300 font-medium">
            <span>{isAr ? 'خط العرض:' : 'Lat:'} <strong className="text-slate-100">{hoverCoords.lat}°</strong></span>
            <span className="text-slate-600">|</span>
            <span>{isAr ? 'خط الطول:' : 'Lng:'} <strong className="text-slate-100">{hoverCoords.lng}°</strong></span>
          </div>
        )}

        {/* ── Left Sidebar: Layers, Advanced Filters, 3D Controls ── */}
        {showPanel && mapLoaded && (
          <div className="map-panel map-panel-left absolute top-3 left-3 bg-slate-900/90 text-slate-100 border border-slate-700/50 p-4 rounded-xl shadow-2xl backdrop-blur-md w-72 max-h-[calc(100%-80px)] overflow-y-auto z-10 scrollbar-thin">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1.5">
                <Layers size={14} />
                {isAr ? 'لوحة التحكم والطبقات' : 'Compliance Layers'}
              </h3>
              <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-slate-200">
                <X size={14} />
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isAr ? 'تفعيل الطبقات' : 'Show/Hide Layers'}</span>
              <div className="space-y-1">
                {layerConfig.map(l => (
                  <button
                    key={l.key}
                    onClick={() => toggleLayer(l.key)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${layers[l.key]
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                      : 'text-slate-400 hover:bg-slate-800/30 border border-transparent'
                      }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: layers[l.key] ? `${l.color}25` : '#334155' }}
                    >
                      <l.icon size={12} style={{ color: layers[l.key] ? l.color : '#94a3b8' }} />
                    </div>
                    <span className="flex-1 text-start truncate">{l.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">{l.count}</span>
                    {layers[l.key] ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Filters */}
            <div className="space-y-3.5 border-t border-slate-800 pt-3 mt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{isAr ? 'مرشحات البيانات النشطة' : 'Layer Specific Filters'}</span>

              {/* Offices Filter */}
              {layers.offices && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-emerald-400 block mb-1.5">{isAr ? 'فلتر مكاتب المركز:' : 'NCEC Office Type'}</label>
                  <select
                    value={officeFilter}
                    onChange={e => setOfficeFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1 outline-none"
                  >
                    <option value="all">{isAr ? 'الكل' : 'All Types'}</option>
                    <option value="HQ">{isAr ? 'المقر الرئيسي' : 'Headquarters'}</option>
                    <option value="Regional">{isAr ? 'إقليمي' : 'Regional Offices'}</option>
                    <option value="Branch">{isAr ? 'فروع' : 'Branch Offices'}</option>
                  </select>
                </div>
              )}

              {/* Monitoring Stations Filter */}
              {layers.monitoring && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-sky-400 block mb-1.5">{isAr ? 'جودة الهواء ومؤشر AQI:' : 'Air Quality Index'}</label>
                  <div className="space-y-2">
                    <select
                      value={aqiFilter}
                      onChange={e => setAqiFilter(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1 outline-none"
                    >
                      <option value="all">{isAr ? 'كل الفئات' : 'All Classes'}</option>
                      <option value="good">{isAr ? 'جيد (≤ 50)' : 'Good (≤ 50)'}</option>
                      <option value="moderate">{isAr ? 'متوسط (51-100)' : 'Moderate (51-100)'}</option>
                      <option value="unhealthy">{isAr ? 'غير صحي (> 100)' : 'Unhealthy (> 100)'}</option>
                    </select>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                        <span>{isAr ? 'الحد الأقصى لمؤشر AQI:' : 'Max AQI Limit:'}</span>
                        <strong className="text-sky-300">{maxAqiSlider}</strong>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={maxAqiSlider}
                        onChange={e => setMaxAqiSlider(parseInt(e.target.value))}
                        className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Industrial Zones Filter */}
              {layers.industrial && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-orange-400 block mb-1.5">{isAr ? 'مستويات الانبعاثات:' : 'Emissions Intensity'}</label>
                  <select
                    value={emissionFilter}
                    onChange={e => setEmissionFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1 outline-none"
                  >
                    <option value="all">{isAr ? 'الكل' : 'All Levels'}</option>
                    <option value="High">{isAr ? 'انبعاثات عالية' : 'High'}</option>
                    <option value="Moderate">{isAr ? 'انبعاثات متوسطة' : 'Moderate'}</option>
                    <option value="Low">{isAr ? 'انبعاثات منخفضة' : 'Low'}</option>
                  </select>
                </div>
              )}

              {/* Protected Areas Filter */}
              {layers.protected && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-emerald-400 block mb-1.5">{isAr ? 'تصنيف المحميات:' : 'Reserve Category'}</label>
                  <select
                    value={protectedFilter}
                    onChange={e => setProtectedFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1 outline-none"
                  >
                    <option value="all">{isAr ? 'جميع المحميات' : 'All Categories'}</option>
                    <option value="Nature Reserve">{isAr ? 'محمية طبيعية' : 'Nature Reserve'}</option>
                    <option value="Wildlife Reserve">{isAr ? 'محمية حياة فطرية' : 'Wildlife Reserve'}</option>
                    <option value="Marine Reserve">{isAr ? 'محمية بحرية' : 'Marine Reserve'}</option>
                  </select>
                </div>
              )}

              {/* EIA Project Status Filter */}
              {layers.eia && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-purple-400 block mb-1.5">{isAr ? 'حالة دراسات الأثر البيئي:' : 'EIA Studies Status'}</label>
                  <select
                    value={eiaFilter}
                    onChange={e => setEiaFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1 outline-none"
                  >
                    <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                    <option value="Approved">{isAr ? 'معتمد' : 'Approved'}</option>
                    <option value="Under Review">{isAr ? 'قيد المراجعة' : 'Under Review'}</option>
                    <option value="Pending">{isAr ? 'معلق' : 'Pending'}</option>
                  </select>
                </div>
              )}

              {/* Red Sea Trenches Depth Filter */}
              {layers.trenches && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] font-semibold text-sky-400 block mb-1.5">{isAr ? 'الحد الأدنى لعمق الخندق:' : 'Min Trench Depth'}</label>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>{isAr ? 'العمق الأدنى:' : 'Min Depth:'}</span>
                      <strong className="text-sky-300">{minTrenchDepth} m</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2500"
                      step="100"
                      value={minTrenchDepth}
                      onChange={e => setMinTrenchDepth(parseInt(e.target.value))}
                      className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3D Global Controls */}
            <div className="border-t border-slate-800 pt-3 mt-3 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{isAr ? 'خصائص التضاريس والكرات' : 'Terrain & 3D Settings'}</span>

              <div className="space-y-2">
                <button
                  onClick={() => setTerrain3D(!terrain3D)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${terrain3D ? 'bg-slate-850 text-slate-100 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                >
                  <span className="flex items-center gap-1.5"><Mountain size={13} className="text-emerald-400" /> {isAr ? 'تضاريس ثلاثية الأبعاد' : '3D Terrain Elevation'}</span>
                  <div className={`w-6 h-3 rounded-full flex items-center px-0.5 transition-colors ${terrain3D ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                    <div className="bg-white w-2.5 h-2.5 rounded-full" />
                  </div>
                </button>

                {terrain3D && (
                  <div className="bg-slate-950/30 p-2 rounded-lg border border-slate-800/80">
                    {showBuildings ? (
                      <div className="text-[10px] text-amber-400 font-semibold leading-relaxed">
                        {isAr
                          ? '⚠️ تم قفل التضخيم عند 1.0x لمنع اختفاء المباني تحت الأرض.'
                          : '⚠️ Exaggeration locked at 1.0x to prevent buildings from sinking.'}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                          <span>{isAr ? 'تضخيم المرتفعات/الخنادق:' : 'Terrain Exaggeration:'}</span>
                          <strong className="text-emerald-400">{terrainExaggeration.toFixed(1)}x</strong>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="3.0"
                          step="0.5"
                          value={terrainExaggeration}
                          onChange={e => setTerrainExaggeration(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowBuildings(!showBuildings)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${showBuildings ? 'bg-slate-850 text-slate-100 border-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                >
                  <span className="flex items-center gap-1.5"><Building2 size={13} className="text-emerald-400" /> {isAr ? 'مباني المدن ثلاثية الأبعاد' : '3D OSM Buildings'}</span>
                  <div className={`w-6 h-3 rounded-full flex items-center px-0.5 transition-colors ${showBuildings ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                    <div className="bg-white w-2.5 h-2.5 rounded-full" />
                  </div>
                </button>
              </div>
            </div>

            {/* Map Styles */}
            <div className="border-t border-slate-800 pt-3 mt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isAr ? 'نمط الخريطة' : 'Imagery Style'}</span>
              <div className="flex gap-1.5">
                {mapStyles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => changeStyle(s.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${currentStyle === s.id
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                  >
                    <s.icon size={13} />
                    <span>{isAr ? s.labelAr : s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Center Bottom: City Quick Travel Bar ── */}
        {mapLoaded && (
          <div className={`map-cities-bar absolute ${isAr ? 'bottom-12 left-1/2 translate-x-1/2' : 'bottom-8 left-1/2 -translate-x-1/2'} bg-slate-900/90 text-slate-200 border border-slate-700/50 rounded-full shadow-2xl backdrop-blur-md px-4 py-1.5 z-10 max-w-[90%] overflow-x-auto scrollbar-none flex items-center gap-2`}>
            <Navigation size={13} className="text-emerald-400 shrink-0 animate-pulse" />
            <div className="flex items-center gap-1.5 shrink-0">
              {cities.map(city => (
                <button
                  key={city.name}
                  onClick={() => flyToCity(city)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${activeCity === city.name
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-800/40'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/40'
                    }`}
                >
                  <MapPin size={10} />
                  <span>{isAr ? city.nameAr : city.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Right Sidebar: Stats Summary, Selected Entity details, and Legend ── */}
        {showPanel && mapLoaded && (
          <div className="map-panel map-panel-right absolute top-3 right-3 bg-slate-900/90 text-slate-100 border border-slate-700/50 p-4 rounded-xl shadow-2xl backdrop-blur-md w-72 max-h-[calc(100%-80px)] overflow-y-auto z-10 scrollbar-thin">

            {/* selected entity popup panel drawer */}
            {selectedEntity ? (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 mb-4 animate-fade-in relative">
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="absolute top-2.5 end-2.5 text-slate-400 hover:text-slate-200"
                >
                  <X size={12} />
                </button>

                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
                    {selectedEntity.properties.layer === 'trench' ? <Waves size={16} /> : <Info size={16} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-100 leading-tight">
                      {isAr ? selectedEntity.properties.nameAr : selectedEntity.properties.name}
                    </h4>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                      {selectedEntity.properties.layer}
                    </span>
                  </div>
                </div>

                {/* Display Specific metadata fields */}
                <div className="space-y-2 text-xs">
                  {selectedEntity.properties.layer === 'offices' && (
                    <>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {isAr ? selectedEntity.properties.descAr : selectedEntity.properties.desc}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">{isAr ? 'الموظفون' : 'Staff Count'}</span>
                          <strong className="text-sm text-emerald-400">{selectedEntity.properties.staff}</strong>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">{isAr ? 'النوع' : 'Office Type'}</span>
                          <strong className="text-xs text-slate-200">{selectedEntity.properties.type}</strong>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEntity.properties.layer === 'monitoring' && (
                    <>
                      <div className="flex items-center justify-center p-3 bg-slate-900 rounded-lg border border-slate-800/80 mb-2">
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">{isAr ? 'مؤشر جودة الهواء' : 'AQI Value'}</span>
                          <strong className="text-3xl font-black leading-none" style={{ color: aqiColor(selectedEntity.properties.aqi) }}>
                            {selectedEntity.properties.aqi}
                          </strong>
                          <span className="text-[10px] font-bold block mt-1" style={{ color: aqiColor(selectedEntity.properties.aqi) }}>
                            {aqiLabel(selectedEntity.properties.aqi, isAr)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                          <span className="text-[9px] text-slate-500 block">PM2.5</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.pm25} µg/m³</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                          <span className="text-[9px] text-slate-500 block">PM10</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.pm10} µg/m³</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                          <span className="text-[9px] text-slate-500 block">NO₂</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.no2} ppb</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-850">
                          <span className="text-[9px] text-slate-500 block">{isAr ? 'الحرارة' : 'Temp'}</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.temp} °C</span>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEntity.properties.layer === 'industrial' && (
                    <>
                      <div className="space-y-2">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 block">{isAr ? 'مستويات انبعاث المصانع' : 'Emissions Intensity'}</span>
                          <strong className={`text-xs ${selectedEntity.properties.emissions === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {isAr ? selectedEntity.properties.emissionsAr : selectedEntity.properties.emissions}
                          </strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-900 p-2 rounded text-center">
                            <span className="text-[9px] text-slate-500 block">{isAr ? 'المنشآت' : 'Facilities'}</span>
                            <span className="font-bold text-slate-200">{selectedEntity.properties.facilities}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded text-center">
                            <span className="text-[9px] text-slate-500 block">{isAr ? 'المساحة' : 'Area'}</span>
                            <span className="font-bold text-xs text-slate-200">{selectedEntity.properties.area}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEntity.properties.layer === 'protected' && (
                    <div className="space-y-2">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-500 block">{isAr ? 'نوع المحمية البيئية' : 'Reserve Type'}</span>
                        <strong className="text-xs text-emerald-400">{isAr ? selectedEntity.properties.typeAr : selectedEntity.properties.type}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-850 text-center">
                        <span className="text-[9px] text-slate-500 block">{isAr ? 'المساحة الكلية' : 'Total Area'}</span>
                        <strong className="text-slate-100">{selectedEntity.properties.area}</strong>
                      </div>
                    </div>
                  )}

                  {selectedEntity.properties.layer === 'eia' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-500">{isAr ? 'الحالة العامة' : 'Review Status'}</span>
                        <strong className="text-[10px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-850">
                          {isAr ? selectedEntity.properties.statusAr : selectedEntity.properties.status}
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 p-2 rounded text-center">
                          <span className="text-[9px] text-slate-500 block">{isAr ? 'مستندات EIA' : 'EIA Volume'}</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.pages} {isAr ? 'صفحة' : 'pages'}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded text-center">
                          <span className="text-[9px] text-slate-500 block">{isAr ? 'التقدم' : 'Progress'}</span>
                          <span className="font-bold text-slate-200">{selectedEntity.properties.progress}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEntity.properties.layer === 'trench' && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] text-slate-400 leading-relaxed italic">
                        {isAr ? selectedEntity.properties.descAr : selectedEntity.properties.desc}
                      </p>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase">{isAr ? 'العمق الأقصى:' : 'Max Depth:'}</span>
                        <strong className="text-sm text-sky-400 font-black">{selectedEntity.properties.depth} m</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-slate-900 p-1.5 rounded">
                          <span className="text-[8px] text-slate-500 block">{isAr ? 'الملوحة' : 'Salinity'}</span>
                          <strong className="text-[11px] text-slate-200">{selectedEntity.properties.salinity}</strong>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded">
                          <span className="text-[8px] text-slate-500 block">{isAr ? 'الحرارة السفلية' : 'Brine Temp'}</span>
                          <strong className="text-[11px] text-slate-200">{selectedEntity.properties.temp} °C</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // If no entity is selected, show general legend & statistics
              <div className="space-y-4">
                {/* 3D Trench Listing */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Waves size={12} className="text-sky-400" />
                    {isAr ? 'خنادق وأعماق البحر الأحمر' : 'Red Sea Deep Trenches'}
                  </h4>
                  <div className="space-y-1">
                    {redSeaTrenches.map(t => (
                      <button
                        key={t.name}
                        onClick={() => flyToCity({ name: t.name, nameAr: t.nameAr, lng: t.lng, lat: t.lat, height: 18000, pitch: -45, bearing: 0 })}
                        className="w-full flex items-center justify-between text-left text-xs bg-slate-950/40 hover:bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-slate-300 truncate max-w-[130px]">{isAr ? t.nameAr : t.name}</span>
                        <span className="text-sky-400 font-extrabold shrink-0 text-[10px]">{t.depth} m</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AQI Overview */}
                <div className="border-t border-slate-850 pt-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Shield size={12} className="text-emerald-400" />
                    {isAr ? 'ملخص محطات رصد البيئة' : 'Air Quality Overview'}
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-900/30 text-emerald-300">
                      <span>{isAr ? 'جيد (≤ 50)' : 'Good (≤ 50)'}</span>
                      <strong className="font-extrabold">{goodStations}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/30 text-amber-300">
                      <span>{isAr ? 'متوسط (51-100)' : 'Moderate (51-100)'}</span>
                      <strong className="font-extrabold">{moderateStations}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-900/30 text-red-300">
                      <span>{isAr ? 'غير صحي (> 100)' : 'Unhealthy (> 100)'}</span>
                      <strong className="font-extrabold">{unhealthyStations}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="border-t border-slate-850 pt-3 mt-4 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {isAr ? 'مؤشرات عامة للمملكة' : 'National Indicators'}
              </h4>

              <div className="bg-slate-950/30 p-2 rounded border border-slate-850 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1"><Wind size={11} className="text-sky-400" /> Avg PM2.5</span>
                <strong className="text-xs text-slate-200">
                  {Math.round(monitoringStations.reduce((a, s) => a + s.pm25, 0) / monitoringStations.length)} µg/m³
                </strong>
              </div>

              <div className="bg-slate-950/30 p-2 rounded border border-slate-850 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1"><Droplets size={11} className="text-violet-400" /> Avg NO₂</span>
                <strong className="text-xs text-slate-200">
                  {Math.round(monitoringStations.reduce((a, s) => a + s.no2, 0) / monitoringStations.length)} ppb
                </strong>
              </div>

              <div className="bg-slate-950/30 p-2 rounded border border-slate-850 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1"><Thermometer size={11} className="text-rose-400" /> Avg Temp</span>
                <strong className="text-xs text-slate-200">
                  {Math.round(monitoringStations.reduce((a, s) => a + s.temp, 0) / monitoringStations.length)} °C
                </strong>
              </div>
            </div>

            {/* Legend */}
            <div className="border-t border-slate-850 pt-3 mt-4 text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-widest block mb-2">{isAr ? 'دليل رموز الخريطة' : 'Map Legend'}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-[#059669] border border-white/20" />
                  <span>{isAr ? 'مكاتب المركز الوطني' : 'NCEC Branch / HQ'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>{isAr ? 'محطات الرصد البيئي' : 'Compliance Air Monitor'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-5 rounded bg-orange-500/25 border border-orange-500" />
                  <span>{isAr ? 'منطقة صناعية (ثلاثية الأبعاد)' : 'Industrial Zone (3D)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-5 rounded bg-green-500/20 border border-green-600" />
                  <span>{isAr ? 'محمية طبيعية بيئية' : 'Nature Reserve'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-5 rounded-t-lg bg-sky-500/35 border border-sky-600" />
                  <span>{isAr ? 'خندق مائي عميق' : 'Red Sea Depth Trench'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explore Random City Button */}
        {mapLoaded && (
          <button
            onClick={() => flyToCity(cities[Math.floor(Math.random() * cities.length)])}
            className="map-fab absolute bottom-52 right-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-10 cursor-pointer border border-emerald-500"
            title={isAr ? 'استكشاف عشوائي' : 'Explore Random City'}
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* 2D Overview Minimap */}
        {mapLoaded && (
          <div
            className="absolute bottom-3 end-18 bg-slate-950/90 border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden z-10 w-64 h-44 transition-all duration-300 hover:border-emerald-500/60 group"
            onMouseEnter={() => { isHoveringMinimap.current = true }}
            onMouseLeave={() => { isHoveringMinimap.current = false }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-300 select-none">
              <span className="flex items-center gap-1">
                <Compass size={11} className="text-emerald-500 animate-pulse" />
                {isAr ? 'الخريطة العامة ثنائية الأبعاد' : '2D Overview Map'}
              </span>
              <span className="text-[8px] px-1 rounded bg-slate-800 text-slate-400">2D</span>
            </div>

            {/* Minimap Cesium Container */}
            <div
              ref={minimapContainer}
              className="w-full h-[calc(100%-25px)]"
              id="minimap-cesium-container"
            />
          </div>
        )}
      </div>
    </div>
  )
}
