from django.conf import settings
from django.db import models


class MeditationSession(models.Model):
    MEDITATION_TYPES = [
        ("mindfulness", "Mindfulness"),
        ("breathing", "Breathing"),
        ("body_scan", "Body Scan"),
        ("loving_kindness", "Loving Kindness"),
        ("walking", "Walking"),
        ("other", "Other"),
    ]
    meditation_type = models.CharField(max_length=20, choices=MEDITATION_TYPES)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration = models.DurationField()
    completed = models.BooleanField()
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.meditation_type} - {self.user.username}"  # type: ignore
