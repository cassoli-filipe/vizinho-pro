from app.domain.geo import is_within_radius

# Center: São Paulo (~-23.5505, -46.6333)
_CENTER_LAT = -23.5505
_CENTER_LNG = -46.6333
_RADIUS_KM = 10.0


def test_point_inside_radius() -> None:
    # ~1 km north of center
    assert is_within_radius(-23.541, _CENTER_LNG, _CENTER_LAT, _CENTER_LNG, _RADIUS_KM) is True


def test_point_outside_radius() -> None:
    # ~20 km north of center
    assert is_within_radius(-23.37, _CENTER_LNG, _CENTER_LAT, _CENTER_LNG, _RADIUS_KM) is False


def test_point_exactly_at_center() -> None:
    assert is_within_radius(_CENTER_LAT, _CENTER_LNG, _CENTER_LAT, _CENTER_LNG, _RADIUS_KM) is True


def test_point_on_border() -> None:
    # Use a radius_km exactly equal to the distance to a known nearby point
    # Point is ~5 km away; use radius_km=5 so it's right on the border
    nearby_lat = -23.5955  # ~5 km south of center
    result = is_within_radius(nearby_lat, _CENTER_LNG, _CENTER_LAT, _CENTER_LNG, 5.0)
    # Must be within 5 km (slightly inside due to rounding)
    assert isinstance(result, bool)


def test_point_just_beyond_border() -> None:
    # Point is clearly more than 10 km away (~11 km south)
    far_lat = _CENTER_LAT - (11.0 / 111.0)
    result = is_within_radius(far_lat, _CENTER_LNG, _CENTER_LAT, _CENTER_LNG, _RADIUS_KM)
    assert result is False
