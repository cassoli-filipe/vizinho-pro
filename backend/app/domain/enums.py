import enum


class UserType(str, enum.Enum):
    MORADOR = "morador"
    PRESTADOR = "prestador"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class ServiceCategory(str, enum.Enum):
    PISCINEIRO = "piscineiro"
    ELETRICISTA = "eletricista"
    JARDINEIRO = "jardineiro"
    ENCANADOR = "encanador"
    PINTOR = "pintor"
    PEDREIRO = "pedreiro"
    LIMPEZA = "limpeza"
    SEGURANCA = "seguranca"
    OUTROS = "outros"
