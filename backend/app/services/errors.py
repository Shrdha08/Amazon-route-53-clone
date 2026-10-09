class ServiceError(Exception):
    """Business-rule failure carrying the HTTP status it should be reported with."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
