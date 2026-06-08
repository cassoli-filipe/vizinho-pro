from typing import Literal

from pydantic import BaseModel


class RecordEventRequest(BaseModel):
    event_type: Literal["WHATSAPP_CLICK"]
    out_of_area: bool = False


class ProviderMetricsResponse(BaseModel):
    profile_views: int
    whatsapp_clicks: int
    out_of_area_clicks: int
    conversion_rate: float
