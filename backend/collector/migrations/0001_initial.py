import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="CollectionLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField(unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("success", "성공"),
                            ("holiday", "휴장"),
                            ("failure", "실패"),
                        ],
                        max_length=20,
                    ),
                ),
                ("collected_at", models.DateTimeField(auto_now=True)),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("expected_holiday", models.BooleanField(default=False)),
                ("error_message", models.TextField(blank=True)),
            ],
            options={
                "db_table": "collection_log",
                "ordering": ["-date"],
            },
        ),
        migrations.CreateModel(
            name="CollectionObservation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField()),
                ("observed_at", models.DateTimeField(auto_now_add=True)),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("succeeded", models.BooleanField(default=True)),
                ("error_message", models.TextField(blank=True)),
            ],
            options={
                "db_table": "collection_observation",
                "ordering": ["-observed_at"],
                "indexes": [
                    models.Index(
                        fields=["date", "observed_at"],
                        name="observation_date_time_idx",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="PriceRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField(db_index=True)),
                ("species", models.CharField(db_index=True, max_length=100)),
                ("status", models.CharField(blank=True, db_index=True, max_length=20)),
                ("origin", models.CharField(blank=True, max_length=100)),
                ("spec", models.CharField(blank=True, max_length=100)),
                ("packaging", models.CharField(blank=True, max_length=100)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=16)),
                ("price_high", models.DecimalField(decimal_places=2, max_digits=16)),
                ("price_low", models.DecimalField(decimal_places=2, max_digits=16)),
                ("price_avg", models.DecimalField(decimal_places=2, max_digits=16)),
            ],
            options={
                "db_table": "price_record",
                "indexes": [
                    models.Index(
                        fields=["species", "date"],
                        name="price_species_date_idx",
                    ),
                    models.Index(
                        fields=["date", "species", "status"],
                        name="price_snapshot_idx",
                    ),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(("quantity__gte", 0)),
                        name="price_quantity_nonnegative",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("price_high__gte", 0)),
                        name="price_high_nonnegative",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("price_low__gte", 0)),
                        name="price_low_nonnegative",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("price_avg__gte", 0)),
                        name="price_avg_nonnegative",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="SpeciesCatalog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("species", models.CharField(max_length=100, unique=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("fish", "어류"),
                            ("shellfish", "패류"),
                            ("crustacean", "갑각류"),
                            ("cephalopod", "두족류"),
                            ("other", "기타"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("is_official", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "species_catalog",
                "ordering": ["species"],
            },
        ),
    ]
