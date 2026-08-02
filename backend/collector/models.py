from django.db import models


class PriceRecord(models.Model):
    date = models.DateField(db_index=True)
    species = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=20, blank=True, db_index=True)
    origin = models.CharField(max_length=100, blank=True)
    spec = models.CharField(max_length=100, blank=True)
    packaging = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=16, decimal_places=3)
    price_high = models.DecimalField(max_digits=16, decimal_places=2)
    price_low = models.DecimalField(max_digits=16, decimal_places=2)
    price_avg = models.DecimalField(max_digits=16, decimal_places=2)

    class Meta:
        db_table = "price_record"
        indexes = [
            models.Index(
                fields=["species", "date"],
                name="price_species_date_idx",
            ),
            models.Index(
                fields=["date", "species", "status"],
                name="price_snapshot_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=0),
                name="price_quantity_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(price_high__gte=0),
                name="price_high_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(price_low__gte=0),
                name="price_low_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(price_avg__gte=0),
                name="price_avg_nonnegative",
            ),
        ]


class CollectionLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "성공"
        HOLIDAY = "holiday", "휴장"
        FAILURE = "failure", "실패"

    date = models.DateField(unique=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    collected_at = models.DateTimeField(auto_now=True)
    row_count = models.PositiveIntegerField(default=0)
    expected_holiday = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "collection_log"
        ordering = ["-date"]


class CollectionObservation(models.Model):
    date = models.DateField()
    observed_at = models.DateTimeField(auto_now_add=True)
    row_count = models.PositiveIntegerField(default=0)
    succeeded = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "collection_observation"
        ordering = ["-observed_at"]
        indexes = [
            models.Index(
                fields=["date", "observed_at"],
                name="observation_date_time_idx",
            )
        ]


class SpeciesCatalog(models.Model):
    class Category(models.TextChoices):
        FISH = "fish", "어류"
        SHELLFISH = "shellfish", "패류"
        CRUSTACEAN = "crustacean", "갑각류"
        CEPHALOPOD = "cephalopod", "두족류"
        OTHER = "other", "기타"

    species = models.CharField(max_length=100, unique=True)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
    )
    is_official = models.BooleanField(default=True)

    class Meta:
        db_table = "species_catalog"
        ordering = ["species"]


class SpeciesProfile(models.Model):
    class ReviewStatus(models.TextChoices):
        DRAFT = "draft", "초안"
        PUBLISHED = "published", "발행"

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "미검증"
        VERIFIED = "verified", "검증됨"
        FLAGGED = "flagged", "문제 발견"

    species = models.CharField(max_length=100, unique=True)
    season = models.CharField(max_length=100, blank=True)
    main_origins = models.JSONField(default=list, blank=True)
    features = models.TextField(blank=True)
    handling_notes = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    source_urls = models.JSONField(default=list, blank=True)
    generated_by = models.CharField(max_length=100, blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.DRAFT,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    verification_notes = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "species_profile"
        ordering = ["species"]
