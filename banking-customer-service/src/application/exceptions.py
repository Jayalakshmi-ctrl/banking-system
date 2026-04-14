class CustomerServiceError(Exception):
    pass


class CustomerNotFoundError(CustomerServiceError):
    pass


class DuplicateCustomerFieldError(CustomerServiceError):
    pass


class InvalidKycTransitionError(CustomerServiceError):
    pass
