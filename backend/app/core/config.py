from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./route53.db"
    cors_origins: str = "http://localhost:3000"
    session_ttl_hours: int = 24
    cookie_name: str = "r53_session"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
