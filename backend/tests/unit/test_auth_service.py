import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.exceptions import CPFAlreadyRegisteredError, ProfileAlreadyExistsError, ProfileNotFoundError
from app.schemas.auth import RegisterMoradorRequest, RegisterPrestadorRequest, UpdateProfileRequest
from app.services import auth as auth_service
from app.services.auth import register_user
from tests.factories import ProfileFactory, ProviderFactory

_VALID_CPF = "529.982.247-25"
_USER_ID = uuid.uuid4()
_EMAIL = "test@example.com"


def _morador_data() -> RegisterMoradorRequest:
    return RegisterMoradorRequest(
        user_type="morador",
        cpf=_VALID_CPF,
        full_name="João Silva",
    )


def _prestador_data() -> RegisterPrestadorRequest:
    return RegisterPrestadorRequest(
        user_type="prestador",
        cpf=_VALID_CPF,
        full_name="Maria Souza",
        business_name="MS Elétrica",
        category="eletricista",
        center_lat=-23.55,
        center_lng=-46.63,
        radius_km=10.0,
    )


@pytest.mark.asyncio
async def test_register_morador_success() -> None:
    mock_db = AsyncMock()
    profile = ProfileFactory.build(id=_USER_ID)

    with (
        patch("app.services.auth.profile_repo.get_by_id", return_value=None),
        patch("app.services.auth.profile_repo.get_by_cpf_hash", return_value=None),
        patch("app.services.auth.profile_repo.create", return_value=profile),
    ):
        result = await register_user(mock_db, user_id=_USER_ID, email=_EMAIL, data=_morador_data())

    assert result.id == _USER_ID


@pytest.mark.asyncio
async def test_register_fails_if_profile_already_exists() -> None:
    mock_db = AsyncMock()
    existing_profile = ProfileFactory.build(id=_USER_ID)

    with patch("app.services.auth.profile_repo.get_by_id", return_value=existing_profile):
        with pytest.raises(ProfileAlreadyExistsError):
            await register_user(mock_db, user_id=_USER_ID, email=_EMAIL, data=_morador_data())


@pytest.mark.asyncio
async def test_register_fails_if_cpf_already_registered() -> None:
    mock_db = AsyncMock()
    existing_profile = ProfileFactory.build()

    with (
        patch("app.services.auth.profile_repo.get_by_id", return_value=None),
        patch("app.services.auth.profile_repo.get_by_cpf_hash", return_value=existing_profile),
    ):
        with pytest.raises(CPFAlreadyRegisteredError):
            await register_user(mock_db, user_id=_USER_ID, email=_EMAIL, data=_morador_data())


@pytest.mark.asyncio
async def test_register_prestador_creates_provider() -> None:
    mock_db = AsyncMock()
    profile = ProfileFactory.build(id=_USER_ID)
    provider = ProviderFactory.build(id=_USER_ID)

    with (
        patch("app.services.auth.profile_repo.get_by_id", return_value=None),
        patch("app.services.auth.profile_repo.get_by_cpf_hash", return_value=None),
        patch("app.services.auth.profile_repo.create", return_value=profile),
        patch("app.services.auth.provider_repo.create", return_value=provider) as mock_provider_create,
    ):
        await register_user(mock_db, user_id=_USER_ID, email=_EMAIL, data=_prestador_data())

    mock_provider_create.assert_called_once()
    call_kwargs = mock_provider_create.call_args.kwargs
    assert call_kwargs["business_name"] == "MS Elétrica"
    assert call_kwargs["center_lat"] == -23.55


@pytest.mark.asyncio
async def test_register_morador_does_not_create_provider() -> None:
    mock_db = AsyncMock()
    profile = ProfileFactory.build(id=_USER_ID)

    with (
        patch("app.services.auth.profile_repo.get_by_id", return_value=None),
        patch("app.services.auth.profile_repo.get_by_cpf_hash", return_value=None),
        patch("app.services.auth.profile_repo.create", return_value=profile),
        patch("app.services.auth.provider_repo.create") as mock_provider_create,
    ):
        await register_user(mock_db, user_id=_USER_ID, email=_EMAIL, data=_morador_data())

    mock_provider_create.assert_not_called()


@pytest.mark.asyncio
async def test_update_profile_success() -> None:
    mock_db = AsyncMock()
    profile = ProfileFactory.build(id=_USER_ID, full_name="Novo Nome")

    with patch("app.services.auth.profile_repo.update", return_value=profile):
        result = await auth_service.update_profile(
            mock_db,
            user_id=_USER_ID,
            data=UpdateProfileRequest(full_name="Novo Nome"),
        )

    assert result.full_name == "Novo Nome"


@pytest.mark.asyncio
async def test_update_profile_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.auth.profile_repo.update", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await auth_service.update_profile(
                mock_db,
                user_id=_USER_ID,
                data=UpdateProfileRequest(full_name="Nome Inexistente"),
            )


@pytest.mark.asyncio
async def test_delete_account_calls_soft_delete() -> None:
    mock_db = AsyncMock()

    with patch("app.services.auth.profile_repo.soft_delete") as mock_delete:
        await auth_service.delete_account(mock_db, user_id=_USER_ID)

    mock_delete.assert_awaited_once_with(mock_db, user_id=_USER_ID)
