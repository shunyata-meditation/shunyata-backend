import logging

from django.conf import settings
from django.contrib.auth.forms import User
from django.core.mail import send_mail
from django.shortcuts import render
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from meditation.constants import (
    VERIFICATION_EMAIL_MESSAGE,
    VERIFICATION_EMAIL_SUBJECT,
    VERIFICATION_URL,
)
from meditation.models import EmailVerificationToken, MeditationSession
from meditation.serializers import (
    MeditationSessionSerializer,
    UserRegistrationSerializer,
)

logger = logging.getLogger(__name__)


def index(request):
    return render(request, "meditation/index.html")


def register_page(request):
    return render(request, "meditation/register.html")


class MeditationSessionViewSet(viewsets.ModelViewSet):
    serializer_class = MeditationSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MeditationSession.objects.filter(user=self.request.user)  # type: ignore[return-value]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            user: User = serializer.save()  # type: ignore
            logger.info(f"User created: {user.username}")

            verification_token = EmailVerificationToken.create_token(user)
            verification_url = VERIFICATION_URL.format(
                frontend_url=settings.FRONTEND_URL,
                token=verification_token.token,
            )

            message = VERIFICATION_EMAIL_MESSAGE.format(
                verification_url=verification_url,
                expiry_hours=settings.VERIFICATION_EMAIL_EXPIRY_HOURS,
            )

            send_mail(
                subject=VERIFICATION_EMAIL_SUBJECT,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],  # type: ignore
                fail_silently=False,
            )

            return Response(
                {
                    "message": "Registration successful. Please check your email to verify your account."
                },
                status=status.HTTP_201_CREATED,
            )

        logger.warning(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            verification_token = EmailVerificationToken.objects.get(token=token)  # type: ignore

            if verification_token.is_expired():
                return Response(
                    {"error": "Verification token has expired. Please register again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = verification_token.user
            user.is_active = True
            user.save()

            verification_token.delete()

            return Response(
                {
                    "message": "Email verified successfully. You can now login with your credentials."
                },
                status=status.HTTP_200_OK,
            )

        except EmailVerificationToken.DoesNotExist:  # type: ignore
            return Response(
                {"error": "Invalid verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
