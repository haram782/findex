from django.urls import path

from api.views import (
    CatalogView,
    SnapshotView,
    SpeciesProfileView,
    TimeSeriesView,
)

urlpatterns = [
    path("catalog/", CatalogView.as_view(), name="catalog"),
    path("timeseries/", TimeSeriesView.as_view(), name="timeseries"),
    path("snapshot/", SnapshotView.as_view(), name="snapshot"),
    path(
        "species-profile/<str:species>/",
        SpeciesProfileView.as_view(),
        name="species-profile",
    ),
]
