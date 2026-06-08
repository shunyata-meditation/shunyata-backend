from meditation.views.auth import (
    CaseInsensitiveTokenObtainPairView,
    UserRegistrationView,
    VerifyEmailView,
)
from meditation.views.pages import (
    index,
    login_page,
    register_page,
    stats_page,
    timer_page,
)
from meditation.views.sessions import MeditationSessionViewSet

__all__ = [
    "index",
    "login_page",
    "register_page",
    "stats_page",
    "timer_page",
    "MeditationSessionViewSet",
    "CaseInsensitiveTokenObtainPairView",
    "UserRegistrationView",
    "VerifyEmailView",
]
