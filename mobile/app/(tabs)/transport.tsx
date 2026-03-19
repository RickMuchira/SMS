import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Alert,
    Platform,
    Modal,
    TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useAuth } from '@/context/auth-context';

type Trip = {
    id: number;
    name: string;
    type: 'morning' | 'evening';
    trip_date: string;
    start_time?: string;
    bus?: { id: number; registration_number: string };
    stops: TripStop[];
};

type TripStop = {
    id: number;
    student_id: number;
    order_sequence: number;
    latitude: number;
    longitude: number;
    address?: string;
    pickup_notes?: string;
    status: 'pending' | 'picked_up' | 'dropped_off' | 'absent';
    student: {
        id: number;
        name: string;
    };
};

type LocationType = 'pickup' | 'dropoff' | 'both';

export default function TripExecutionScreen() {
    const { token, permissions, roles, schoolLocation } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [locationPermission, setLocationPermission] = useState(false);
    const [locationEditorStop, setLocationEditorStop] = useState<TripStop | null>(null);
    const [locationType, setLocationType] = useState<LocationType>('pickup');
    const [locationAddress, setLocationAddress] = useState('');
    const [savingLocation, setSavingLocation] = useState(false);

    const mapWebViewRef = useRef<WebView>(null);
    const canAccessTransport =
        roles.includes('super-admin') ||
        permissions.includes('view transport') ||
        permissions.includes('manage transport') ||
        permissions.includes('execute trips');
    const canExecuteTrips =
        roles.includes('super-admin') ||
        permissions.includes('manage transport') ||
        permissions.includes('execute trips');

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationPermission(true);
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation([location.coords.longitude, location.coords.latitude]);
            }
        })();
    }, []);

    useEffect(() => {
        if (!locationPermission) return;

        const subscription = Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
            },
            (location) => {
                setCurrentLocation([location.coords.longitude, location.coords.latitude]);
            },
        );

        return () => {
            subscription.then((sub) => sub.remove());
        };
    }, [locationPermission]);

    const fetchTodaysTrips = useCallback(async () => {
        if (!token || !canAccessTransport) {
            setTrips([]);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/transport/trips/today`,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            if (!response.ok) throw new Error('Failed to load trips');
            const data = await response.json();
            setTrips(data.trips || []);
            if (data.trips.length > 0) {
                setSelectedTrip(data.trips[0]);
            }
        } catch (err) {
            setError('Unable to load trips');
        } finally {
            setLoading(false);
        }
    }, [canAccessTransport, token]);

    useEffect(() => {
        fetchTodaysTrips();
    }, [fetchTodaysTrips]);

    async function updateStopStatus(
        stopId: number,
        status: 'picked_up' | 'dropped_off' | 'absent',
    ) {
        if (!selectedTrip || !token) return;

        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/transport/trips/${selectedTrip.id}/stops/${stopId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status }),
                },
            );

            if (!response.ok) throw new Error('Failed to update stop');

            const data = await response.json();
            setSelectedTrip((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    stops: prev.stops.map((stop) =>
                        stop.id === stopId ? { ...stop, status: data.stop.status } : stop,
                    ),
                };
            });
            setTrips((prev) =>
                prev.map((trip) =>
                    trip.id === selectedTrip.id
                        ? {
                              ...trip,
                              stops: trip.stops.map((stop) =>
                                  stop.id === stopId ? { ...stop, status: data.stop.status } : stop,
                              ),
                          }
                        : trip,
                ),
            );
        } catch (err) {
            Alert.alert('Error', 'Failed to update stop status');
        }
    }

    function openLocationEditor(stop: TripStop) {
        if (!currentLocation) {
            Alert.alert(
                'Current location unavailable',
                'Move to the student location and allow GPS access first, then try again.',
            );
            return;
        }

        setLocationEditorStop(stop);
        setLocationType(selectedTrip?.type === 'evening' ? 'dropoff' : 'pickup');
        setLocationAddress(stop.address ?? '');
    }

    function closeLocationEditor() {
        if (savingLocation) {
            return;
        }

        setLocationEditorStop(null);
        setLocationAddress('');
        setLocationType(selectedTrip?.type === 'evening' ? 'dropoff' : 'pickup');
    }

    async function saveStudentLocation() {
        if (!locationEditorStop || !currentLocation || !token) {
            return;
        }

        setSavingLocation(true);

        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/transport/locations`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        student_id: locationEditorStop.student_id,
                        bus_id: selectedTrip?.bus?.id ?? null,
                        latitude: currentLocation[1],
                        longitude: currentLocation[0],
                        location_type: locationType,
                        address: locationAddress || null,
                    }),
                },
            );

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message ?? 'Failed to save student location');
            }

            setSelectedTrip((prev) => {
                if (!prev) {
                    return null;
                }

                return {
                    ...prev,
                    stops: prev.stops.map((stop) =>
                        stop.id === locationEditorStop.id
                            ? {
                                  ...stop,
                                  latitude: currentLocation[1],
                                  longitude: currentLocation[0],
                                  address: locationAddress || stop.address,
                              }
                            : stop,
                    ),
                };
            });

            setTrips((prev) =>
                prev.map((trip) =>
                    trip.id === selectedTrip?.id
                        ? {
                              ...trip,
                              stops: trip.stops.map((stop) =>
                                  stop.id === locationEditorStop.id
                                      ? {
                                            ...stop,
                                            latitude: currentLocation[1],
                                            longitude: currentLocation[0],
                                            address: locationAddress || stop.address,
                                        }
                                      : stop,
                              ),
                          }
                        : trip,
                ),
            );

            Alert.alert(
                'Location saved',
                `${locationEditorStop.student.name}'s ${locationType} location has been updated from your current GPS position.`,
            );
            closeLocationEditor();
        } catch (saveError) {
            Alert.alert(
                'Unable to save location',
                saveError instanceof Error ? saveError.message : 'Please try again.',
            );
        } finally {
            setSavingLocation(false);
        }
    }

    function openNavigation(latitude: number, longitude: number, label: string) {
        const scheme = Platform.select({
            ios: 'maps://0,0?q=',
            android: 'geo:0,0?q=',
        });
        const latLng = `${latitude},${longitude}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`,
        });

        if (url) {
            Linking.openURL(url);
        }
    }

    function getNextPendingStop() {
        if (!selectedTrip) return null;
        return selectedTrip.stops.find((stop) => stop.status === 'pending');
    }

    const completedStops = selectedTrip?.stops.filter(
        (s) => s.status === 'picked_up' || s.status === 'dropped_off',
    ).length;
    const totalStops = selectedTrip?.stops.length || 0;

    const mapCenter: [number, number] = useMemo(() => {
        if (currentLocation) return [currentLocation[1], currentLocation[0]]; // [lat, lng]
        if (
            schoolLocation?.latitude !== null &&
            schoolLocation?.latitude !== undefined &&
            schoolLocation?.longitude !== null &&
            schoolLocation?.longitude !== undefined
        ) {
            return [schoolLocation.latitude as number, schoolLocation.longitude as number];
        }
        if (selectedTrip?.stops.length) {
            return [selectedTrip.stops[0].latitude, selectedTrip.stops[0].longitude];
        }
        return [-1.2921, 36.8219];
    }, [currentLocation, schoolLocation, selectedTrip]);

    const leafletHtml = useMemo(() => {
        const stops = selectedTrip?.stops ?? [];
        const stopsJson = JSON.stringify(
            stops.map((s, i) => ({
                lat: s.latitude,
                lng: s.longitude,
                label: String(i + 1),
                name: s.student.name,
                address: s.address ?? '',
                status: s.status,
            })),
        );
        const curLat = currentLocation ? currentLocation[1] : null;
        const curLng = currentLocation ? currentLocation[0] : null;
        const centerLat = mapCenter[0];
        const centerLng = mapCenter[1];

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .stop-marker {
      width: 32px; height: 32px; border-radius: 50%;
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35); line-height: 28px; text-align: center;
    }
    .cur-marker {
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(59,130,246,0.3); display: flex;
      align-items: center; justify-content: center;
    }
    .cur-dot { width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var stops = ${stopsJson};
  var curLat = ${curLat ?? 'null'};
  var curLng = ${curLng ?? 'null'};
  var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB © OpenStreetMap contributors',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Route polyline
  if (stops.length > 1) {
    var coords = stops.map(function(s) { return [s.lat, s.lng]; });
    L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
  }

  // Stop markers
  stops.forEach(function(s) {
    var color = s.status === 'picked_up' || s.status === 'dropped_off'
      ? '#10b981' : s.status === 'absent' ? '#ef4444' : '#3b82f6';
    var icon = L.divIcon({
      html: '<div class="stop-marker" style="background:' + color + '">' + s.label + '</div>',
      iconSize: [32, 32], iconAnchor: [16, 16], className: ''
    });
    L.marker([s.lat, s.lng], { icon: icon })
      .bindPopup('<b>' + s.name + '</b><br/>' + (s.address || 'No address'))
      .addTo(map);
  });

  // Current location marker
  var curMarker = null;
  if (curLat !== null && curLng !== null) {
    var curIcon = L.divIcon({
      html: '<div class="cur-marker"><div class="cur-dot"></div></div>',
      iconSize: [20, 20], iconAnchor: [10, 10], className: ''
    });
    curMarker = L.marker([curLat, curLng], { icon: curIcon }).addTo(map);
  }

  // Listen for location updates from React Native
  document.addEventListener('message', function(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.type === 'location' && d.lat !== null) {
        if (curMarker) { curMarker.setLatLng([d.lat, d.lng]); }
        else {
          var ci = L.divIcon({ html: '<div class="cur-marker"><div class="cur-dot"></div></div>', iconSize:[20,20], iconAnchor:[10,10], className:'' });
          curMarker = L.marker([d.lat, d.lng], { icon: ci }).addTo(map);
        }
      }
    } catch(err) {}
  });
  window.addEventListener('message', function(e) {
    document.dispatchEvent(new MessageEvent('message', { data: e.data }));
  });
</script>
</body>
</html>`;
    }, [selectedTrip, mapCenter, currentLocation]);

    // Push location updates into the WebView without re-rendering it
    useEffect(() => {
        if (!mapWebViewRef.current || !currentLocation) return;
        mapWebViewRef.current.injectJavaScript(
            `(function(){
                var d={type:'location',lat:${currentLocation[1]},lng:${currentLocation[0]}};
                window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(d)}));
            })(); true;`,
        );
    }, [currentLocation]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading your trips...</Text>
            </View>
        );
    }

    if (!canAccessTransport) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>
                    Your account does not have transport access.
                </Text>
            </View>
        );
    }

    if (error || trips.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>
                    {error || 'No trips assigned for today'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {selectedTrip && (
                <>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {selectedTrip.bus?.registration_number} -{' '}
                            {selectedTrip.type === 'morning' ? 'Morning' : 'Afternoon'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {completedStops} of {totalStops} stops completed
                        </Text>
                        <Text style={styles.helperText}>
                            Use "Save Location" when you are physically at a student pickup or
                            dropoff point.
                        </Text>
                    </View>

                    <View style={styles.mapContainer}>
                        <WebView
                            ref={mapWebViewRef}
                            key={selectedTrip?.id}
                            source={{ html: leafletHtml }}
                            style={styles.map}
                            originWhitelist={['*']}
                            javaScriptEnabled
                            domStorageEnabled
                            startInLoadingState
                            renderLoading={() => (
                                <View style={styles.mapLoading}>
                                    <ActivityIndicator color="#3b82f6" />
                                    <Text style={styles.mapLoadingText}>Loading map…</Text>
                                </View>
                            )}
                        />
                    </View>

                    <View style={styles.bottomSheet}>
                        <ScrollView style={styles.stopsList}>
                            {selectedTrip.stops.map((stop, index) => (
                                <View key={stop.id} style={styles.stopCard}>
                                    <View style={styles.stopHeader}>
                                        <Text style={styles.stopNumber}>{index + 1}</Text>
                                        <View style={styles.stopInfo}>
                                            <Text style={styles.studentName}>{stop.student.name}</Text>
                                            <Text style={styles.stopAddress}>
                                                {stop.address || 'No address'}
                                            </Text>
                                            {stop.pickup_notes && (
                                                <Text style={styles.pickupNotes}>
                                                    Note: {stop.pickup_notes}
                                                </Text>
                                            )}
                                        </View>
                                        <Text
                                            style={[
                                                styles.statusBadge,
                                                stop.status === 'picked_up' ||
                                                stop.status === 'dropped_off'
                                                    ? styles.statusCompleted
                                                    : stop.status === 'absent'
                                                      ? styles.statusAbsent
                                                      : styles.statusPending,
                                            ]}
                                        >
                                            {stop.status.replace('_', ' ')}
                                        </Text>
                                    </View>

                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            style={[styles.button, styles.buttonNavigate]}
                                            onPress={() =>
                                                openNavigation(
                                                    stop.latitude,
                                                    stop.longitude,
                                                    stop.student.name,
                                                )
                                            }
                                        >
                                            <Text style={styles.buttonText}>Navigate</Text>
                                        </TouchableOpacity>
                                        {canExecuteTrips && (
                                            <TouchableOpacity
                                                style={[styles.button, styles.buttonLocation]}
                                                onPress={() => openLocationEditor(stop)}
                                            >
                                                <Text style={styles.buttonText}>
                                                    {stop.address ? 'Update Location' : 'Save Location'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {stop.status === 'pending' && canExecuteTrips && (
                                        <View style={styles.actions}>
                                            <TouchableOpacity
                                                style={[styles.button, styles.buttonPickup]}
                                                onPress={() =>
                                                    updateStopStatus(
                                                        stop.id,
                                                        selectedTrip.type === 'morning'
                                                            ? 'picked_up'
                                                            : 'dropped_off',
                                                    )
                                                }
                                            >
                                                <Text style={styles.buttonText}>
                                                    {selectedTrip.type === 'morning'
                                                        ? 'Picked Up'
                                                        : 'Dropped Off'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.button, styles.buttonAbsent]}
                                                onPress={() => updateStopStatus(stop.id, 'absent')}
                                            >
                                                <Text style={styles.buttonText}>Absent</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <Modal
                        visible={locationEditorStop !== null}
                        transparent
                        animationType="slide"
                        onRequestClose={closeLocationEditor}
                    >
                        <View style={styles.modalBackdrop}>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>Save student location</Text>
                                <Text style={styles.modalSubtitle}>
                                    {locationEditorStop?.student.name}
                                </Text>
                                <Text style={styles.modalHelper}>
                                    This will save your current GPS position for the selected
                                    student.
                                </Text>

                                <View style={styles.segmentRow}>
                                    {(['pickup', 'dropoff', 'both'] as LocationType[]).map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.segmentButton,
                                                locationType === type && styles.segmentButtonActive,
                                            ]}
                                            onPress={() => setLocationType(type)}
                                        >
                                            <Text
                                                style={[
                                                    styles.segmentButtonText,
                                                    locationType === type &&
                                                        styles.segmentButtonTextActive,
                                                ]}
                                            >
                                                {type === 'both'
                                                    ? 'Both'
                                                    : type.charAt(0).toUpperCase() + type.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={styles.addressInput}
                                    value={locationAddress}
                                    onChangeText={setLocationAddress}
                                    placeholder="Address or landmark"
                                    placeholderTextColor="#9ca3af"
                                    multiline
                                />

                                <Text style={styles.modalCoords}>
                                    GPS: {currentLocation?.[1].toFixed(6) ?? '...'}, {' '}
                                    {currentLocation?.[0].toFixed(6) ?? '...'}
                                </Text>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.modalCancelButton]}
                                        onPress={closeLocationEditor}
                                        disabled={savingLocation}
                                    >
                                        <Text style={styles.buttonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonLocation]}
                                        onPress={saveStudentLocation}
                                        disabled={savingLocation}
                                    >
                                        <Text style={styles.buttonText}>
                                            {savingLocation ? 'Saving...' : 'Save'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 6,
    },
    mapContainer: {
        height: 300,
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    mapLoadingText: {
        marginTop: 8,
        fontSize: 13,
        color: '#6b7280',
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#fff',
    },
    stopsList: {
        flex: 1,
        padding: 16,
    },
    stopCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
        marginBottom: 12,
    },
    stopHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    stopNumber: {
        fontSize: 16,
        fontWeight: '700',
        marginRight: 12,
        width: 24,
    },
    stopInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
    },
    stopAddress: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    pickupNotes: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 4,
        fontStyle: 'italic',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusPending: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
    },
    statusCompleted: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
    },
    statusAbsent: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonNavigate: {
        backgroundColor: '#6366f1',
    },
    buttonPickup: {
        backgroundColor: '#10b981',
    },
    buttonAbsent: {
        backgroundColor: '#ef4444',
    },
    buttonLocation: {
        backgroundColor: '#2563eb',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalSubtitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    modalHelper: {
        fontSize: 13,
        color: '#6b7280',
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 8,
    },
    segmentButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    segmentButtonActive: {
        backgroundColor: '#dbeafe',
        borderColor: '#2563eb',
    },
    segmentButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    segmentButtonTextActive: {
        color: '#1d4ed8',
    },
    addressInput: {
        minHeight: 84,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        color: '#111827',
    },
    modalCoords: {
        fontSize: 12,
        color: '#6b7280',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    modalCancelButton: {
        backgroundColor: '#6b7280',
    },
});
