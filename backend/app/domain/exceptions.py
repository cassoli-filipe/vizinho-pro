class CPFAlreadyRegisteredError(Exception):
    pass


class ProfileAlreadyExistsError(Exception):
    pass


class ProfileNotFoundError(Exception):
    pass


class DuplicateReviewError(Exception):
    """Raised when a resident tries to review the same provider more than once."""
    pass


class NotAResidentError(Exception):
    """Raised when a non-resident user tries to perform a resident-only action."""
    pass


class NotAProviderError(Exception):
    """Raised when a non-provider user tries to perform a provider-only action."""
    pass


class AlreadyRespondedError(Exception):
    """Raised when a provider tries to respond to a review that already has a response."""
    pass


class ReviewNotFoundError(Exception):
    pass
