import pytest

from app.core.security import hash_cpf, mask_cpf, validate_cpf


@pytest.mark.parametrize(
    "cpf,expected",
    [
        ("529.982.247-25", True),
        ("111.111.111-11", False),  # all same digits
        ("000.000.000-00", False),  # all same digits
        ("529.982.247-26", False),  # wrong second check digit
        ("529.982.247-35", False),  # wrong first check digit
        ("123.456.789-00", False),  # invalid
        ("", False),
        ("1234567890123", False),   # too long
    ],
)
def test_validate_cpf(cpf: str, expected: bool) -> None:
    assert validate_cpf(cpf) == expected


def test_hash_cpf_is_deterministic() -> None:
    assert hash_cpf("529.982.247-25") == hash_cpf("529.982.247-25")


def test_hash_cpf_strips_formatting() -> None:
    assert hash_cpf("529.982.247-25") == hash_cpf("52998224725")


def test_hash_cpf_is_not_plaintext() -> None:
    assert hash_cpf("529.982.247-25") != "52998224725"


def test_mask_cpf_always_returns_mask() -> None:
    assert mask_cpf("529.982.247-25") == "***.***.***-**"
    assert mask_cpf("52998224725") == "***.***.***-**"
