import math


def is_within_radius(
    lat: float,
    lng: float,
    center_lat: float,
    center_lng: float,
    radius_km: float,
) -> bool:
    """Return True if (lat, lng) is within radius_km of (center_lat, center_lng).

    Uses the Haversine formula for great-circle distance.
    """
    earth_radius_km = 6371.0
    dlat = math.radians(lat - center_lat)
    dlng = math.radians(lng - center_lng)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(center_lat))
        * math.cos(math.radians(lat))
        * math.sin(dlng / 2) ** 2
    )
    distance_km = 2 * earth_radius_km * math.asin(math.sqrt(a))
    return distance_km <= radius_km
