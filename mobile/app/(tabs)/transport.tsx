import React, { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '@/context/auth-context';

let MapboxGL: any = null;

try {
    if (Platform.OS !== 'web') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        MapboxGL = require('@rnmapbox/maps');
        MapboxGL.setAccessToken(null);
    }
} catch (error) {
    console.warn(
        '@rnmapbox/maps native module not available. Map view will be disabled in this build.',
        error,
    );
    MapboxGL = null;
}

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

export default function TripExecutionScreen() {
    const { apiToken } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [locationPermission, setLocationPermission] = useState(false);

    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

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
        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/transport/trips/today`,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${apiToken}`,
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
    }, [apiToken]);

    useEffect(() => {
        fetchTodaysTrips();
    }, [fetchTodaysTrips]);

    async function updateStopStatus(
        stopId: number,
        status: 'picked_up' | 'dropped_off' | 'absent',
    ) {
        if (!selectedTrip) return;

        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile/transport/trips/${selectedTrip.id}/stops/${stopId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${apiToken}`,
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

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading your trips...</Text>
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

    const routeCoordinates =
        selectedTrip?.stops.map((stop) => [stop.longitude, stop.latitude]) ?? [];

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
                    </View>

                    <View style={styles.mapContainer}>
                        {MapboxGL ? (
                            <MapboxGL.MapView
                                ref={mapRef}
                                style={styles.map}
                                styleURL="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                            >
                                <MapboxGL.Camera
                                    ref={cameraRef}
                                    zoomLevel={12}
                                    centerCoordinate={currentLocation || [36.8219, -1.2921]}
                                    animationMode="flyTo"
                                />

                                {currentLocation && (
                                    <MapboxGL.PointAnnotation
                                        id="current-location"
                                        coordinate={currentLocation}
                                    >
                                        <View style={styles.currentLocationMarker}>
                                            <View style={styles.currentLocationDot} />
                                        </View>
                                    </MapboxGL.PointAnnotation>
                                )}

                                {selectedTrip.stops.map((stop, index) => (
                                    <MapboxGL.PointAnnotation
                                        key={stop.id}
                                        id={`stop-${stop.id}`}
                                        coordinate={[stop.longitude, stop.latitude]}
                                    >
                                        <View
                                            style={[
                                                styles.marker,
                                                stop.status === 'picked_up' ||
                                                stop.status === 'dropped_off'
                                                    ? styles.markerCompleted
                                                    : stop.status === 'absent'
                                                      ? styles.markerAbsent
                                                      : styles.markerPending,
                                            ]}
                                        >
                                            <Text style={styles.markerText}>{index + 1}</Text>
                                        </View>
                                    </MapboxGL.PointAnnotation>
                                ))}

                                {routeCoordinates.length > 1 && (
                                    <MapboxGL.ShapeSource
                                        id="route"
                                        shape={{
                                            type: 'Feature',
                                            properties: {},
                                            geometry: {
                                                type: 'LineString',
                                                coordinates: routeCoordinates,
                                            },
                                        }}
                                    >
                                        <MapboxGL.LineLayer
                                            id="route-line"
                                            style={{
                                                lineColor: '#3b82f6',
                                                lineWidth: 4,
                                            }}
                                        />
                                    </MapboxGL.ShapeSource>
                                )}
                            </MapboxGL.MapView>
                        ) : (
                            <View style={[styles.map, styles.mapFallback]}>
                                <Text style={styles.mapFallbackText}>
                                    Map view is unavailable in this Expo Go build. Rebuild the app
                                    with a development client to enable live maps.
                                </Text>
                            </View>
                        )}
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

                                    {stop.status === 'pending' && (
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
    mapContainer: {
        height: 300,
    },
    map: {
        flex: 1,
    },
    mapFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    mapFallbackText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
    },
    currentLocationMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    currentLocationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
    },
    marker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerPending: {
        backgroundColor: '#3b82f6',
    },
    markerCompleted: {
        backgroundColor: '#10b981',
    },
    markerAbsent: {
        backgroundColor: '#ef4444',
    },
    markerText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
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
});
