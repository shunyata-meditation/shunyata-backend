from django.shortcuts import render
from rest_framework import permissions, viewsets

from meditation.models import MeditationSession
from meditation.serializers import MeditationSessionSerializer


def index(request):
    return render(request, "meditation/index.html")


class MeditationSessionViewSet(viewsets.ModelViewSet):
    serializer_class = MeditationSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MeditationSession.objects.filter(user=self.request.user)  # type: ignore[return-value]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
