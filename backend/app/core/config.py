from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False)

    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_access_expire_minutes: int = 30
    jwt_refresh_expire_days: int = 7
    env: str = "development"
    super_admin_email: str
    super_admin_password: str

    # HEMIS OAuth2 (university SSO) - see docs/HEMIS_OAUTH.md
    hemis_base_url: str = "https://hemis.xiuedu.uz"
    hemis_client_id: str = ""
    hemis_client_secret: str = ""
    hemis_redirect_uri: str = ""
    frontend_base_url: str = "http://localhost:6100"

    # HEMIS REST API (server-side employee directory, separate token from OAuth
    # above - generated in the HEMIS admin panel) - see app/services/hemis_rest.py
    hemis_rest_base_url: str = "https://student.xiuedu.uz/rest"
    hemis_api_token: str = ""


settings = Settings()
