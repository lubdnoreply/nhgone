import logging
from cryptography.fernet import Fernet
from app.config import settings
import base64

logger = logging.getLogger(__name__)

# Sensitive fields to encrypt/decrypt
SENSITIVE_FIELDS = {
    # Reservations
    "Last name", "First name", "Email", "Telephone", "Address", "Booker", "Notes",
    # Members
    "full_name", "email", "phone", "address",
    # Payments
    "payer_name", "card_number", "card_holder"
}

class EncryptionService:
    def __init__(self):
        key = settings.ENCRYPTION_KEY
        if not key:
            # Fallback for development ONLY - DO NOT USE IN PRODUCTION
            # This is a dummy key: Fernet.generate_key().decode()
            key = "dV9YenE2X2pUeDVPZzZfX1ZfX1ZfX1ZfX1ZfX1ZfX1ZfX1ZfX1o=" 
            logger.warning("ENCRYPTION_KEY not set in environment. Using fallback key.")
        
        try:
            self.fernet = Fernet(key.encode())
        except Exception as e:
            logger.error(f"Invalid ENCRYPTION_KEY: {e}")
            # Ensure it's a valid 32-byte b64 encoded key
            self.fernet = None

    def encrypt(self, text: str) -> str:
        if not text or not self.fernet:
            return text
        try:
            return self.fernet.encrypt(text.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return text

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text or not self.fernet:
            return encrypted_text
        try:
            return self.fernet.decrypt(encrypted_text.encode()).decode()
        except Exception:
            # If decryption fails, it might be plaintext (existing data)
            return encrypted_text

    def encrypt_data(self, data: dict) -> dict:
        """Encrypt sensitive fields in a dictionary."""
        if not data:
            return data
        
        new_data = data.copy()
        for key in SENSITIVE_FIELDS:
            if key in new_data and isinstance(new_data[key], str):
                new_data[key] = self.encrypt(new_data[key])
        return new_data

    def decrypt_data(self, data: dict) -> dict:
        """Decrypt sensitive fields in a dictionary."""
        if not data:
            return data
        
        new_data = data.copy()
        for key in SENSITIVE_FIELDS:
            if key in new_data and isinstance(new_data[key], str):
                new_data[key] = self.decrypt(new_data[key])
        return new_data

encryption_service = EncryptionService()
